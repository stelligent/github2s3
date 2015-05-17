console.log('Loading function');

var aws = require('aws-sdk');
var config = require('config');
var http = require('http');
var fs = require('fs');

var githubUrl = "http://github.com";

determineDestination = function(repoShort, fileName) {
    var destination = null
    for (var index in config.config.repository) {
        repoObj = config.config.repository[index]
        if (repoObj.name == repoShort ) {
            for(var i in repoObj.files) {
                fileObj = repoObj.files[i]
                if (fileName == fileObj.name) {
                    return {'bucket': repoObj.bucket,
                            'key': (repoObj.base_path + "/" + fileObj.dest)
                           }
                }
            }
        }
    }

    return destination;
}

copyToS3 = function(source, bucket, key) {

    console.log("Transfering from: " + source);
    console.log("To S3 Bucket: " + bucket);
    console.log("With Key: "+ key);

    var s3 = new aws.S3({params: {Bucket: bucket, Key: key}});

    s3.createBucket(function(err) {
        if (err) { console.log("Error: ", err); }
        else {
            s3.upload({Body: "Success!"}, function() {
                console.log("Uploaded to " + bucket +"/"+key)
            });
        }

        if (err) { console.log("Error: ", err); }
        else {
            var request = http.get(source, function(response) {
                s3.upload({Body: response.pipe()}).
                    on('httpUploadProgress', function(evt) { console.log(evt); }).
                    send(function(err, data) { console.log(err, data) })
            })
        }
    });

}

/* Local test
testS3 = determineDestination("hookshot", "test.sh");
testSource = ( githubUrl + "/NickDeClario/hookshot/blob/master/test.sh")
console.log("Destination: " + testS3.key);
var result = copyToS3(testSource, testS3.bucket, testS3.key);
*/

exports.handler = function(event, context) {
    
    jsonMessage = event.Records[0].Sns.Message;
    var jsonObj = JSON.parse(jsonMessage);
    
    repository = jsonObj.repository.full_name;
    repositoryShortName = jsonObj.repository.name;
    defaultBranch = jsonObj.repository.default_branch;
    url = jsonObj.repository.url;

    var removeFiles = [];
    var uploadFiles = [];

    for (var index in jsonObj.commits) {
        jsonObj.commits[index].added.forEach(function(value) {
            var object = { 'name': value,
                           'repoShort': repositoryShortName,
                           'source': ( githubUrl + "/" + repository + "/blob/" + defaultBranch + "/" + value),
                           'destination': determineDestination(repositoryShortName, value)
                         };
            if (object.destination != null) { uploadFiles.push(object) }
        });
        jsonObj.commits[index].modified.forEach(function(value) {
            var object = { 'name': value,
                           'repoShort': repositoryShortName,
                           'source': ( repository + "/" + value ),
                           'destination': determineDestination(repositoryShortName, value)
                         };
            if (object.destination != null) { uploadFiles.push(object) }
        });
        jsonObj.commits[index].removed.forEach(function(value) {
            var object = { 'name': value,
                           'repoShort': repositoryShortName,
                           'source': ( repository + "/" + value ),
                           'destination': determineDestination(repositoryShortName, value)
                         };
            if (object.destination != null) { removeFiles.push(object) }
        });

    }
    
    uploadFiles.forEach(function(value) {
        console.log("Uploading: " + value.source + " ==> " + value.destination.key);
        var result = copyToS3(value.source, value.destination.bucket, value.destination.key);
    });


    removeFiles.forEach(function(value) {
        console.log("Removing: " + value.source + " ==> " + value.destination.key);
    });

    context.succeed("Updated Repository: " + repository);
    context.fail('Something went wrong');
};
