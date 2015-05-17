console.log('Loading function');

var aws = require('aws-sdk');
var config = require('config');

var githubUrl = "https://github.com";

determineDestination = function(repoShort, fileName) {
    var destination = null
    for (var index in config.config.repository) {
        repoObj = config.config.repository[index]
        if (repoObj.name == repoShort ) {
            for(var i in repoObj.files) {
                fileObj = repoObj.files[i]
                if (fileName == fileObj.name) {
                    return "s3://" + repoObj.bucket + "/" + repoObj.base_path + "/" + fileObj.dest;
                }
            }
        }
    }

    return destination;
}

//console.log("Destination: " + determineDestination("hookshot", "test.sh"))

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
        console.log("Uploading: " + value.source + " ==> " + value.destination);
    });


    removeFiles.forEach(function(value) {
        console.log("Removing: " + value.source + " ==> " + value.destination);
    });

    context.succeed("Updated Repository: " + repository);
    context.fail('Something went wrong');
};
