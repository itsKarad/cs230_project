const AWS = require('aws-sdk');

// AWS config
AWS.config.update({
    accessKeyId: 'AKIAXXPXUJR5BB7KXYWQ',
    secretAccessKey: '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',
    region: 'us-east-2'
});

let ec2 = new AWS.EC2();

exports.getEc2InstancePublicIpAddressByName = async(instanceName) => {
    let publicIpAddress = "NOT_FOUND";
    try {
        const params = {
            Filters: [
                {
                    Name: 'tag:Name',
                    Values: [`*${instanceName}*`]
                },
                {
                    Name: 'instance-state-name',
                    Values: ['running']
                }
            ]
        };
        const data = await ec2.describeInstances(params).promise();
        if (data.Reservations.length > 0) {
            publicIpAddress = data.Reservations[0].Instances[0].PublicIpAddress;
            console.log(`EC2 instance with name "${instanceName}" found. publicIpAddress is : ${publicIpAddress}`);
        } else {
            console.log(`No EC2 found with name "${instanceName}"`);
        }
    } catch (err) {
        console.error('Error occurred while searching for EC2:', err);
    }
    return publicIpAddress;
}