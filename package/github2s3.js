console.log('Loading function');

var aws = require('aws-sdk');
var config = require('config');

exports.handler = function(event, context) {
    
    jsonMessage = event.Records[0].Sns.Message;
    var jsonObj = JSON.parse(jsonMessage);
    
    for (var index in jsonObj.commits) {
        console.log("Added file(s): " + jsonObj.commits[index].added.join([seperator = ',']));
        console.log("Removed file(s): " + jsonObj.commits[index].removed.join([seperator = ',']));
        console.log("Modified file(s): " + jsonObj.commits[index].modified.join([seperator = ',']));
    }
    
    context.succeed("Updated Repository: " + jsonObj.repository.name);
    context.fail('Something went wrong');
};
