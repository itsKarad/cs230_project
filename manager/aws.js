const AWS = require('aws-sdk');
const fs = require('fs');

// AWS config
AWS.config.update({
    accessKeyId: 'AKIAXXPXUJR5BB7KXYWQ',
    secretAccessKey: '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',
    region: 'us-east-2'
});

let ec2 = new AWS.EC2();

// Config for replicating from base worker application
const params = {
    InstanceIds: ['i-0c34ee112c8cc678e']
};
const BASE_AMI_ID = "ami-0aa97fadf4b5cfa9d";
// let ec2_launch_commands = [
//     "sudo apt update",
//     "sudo apt install docker.io",
//     "y",
//     "sudo systemctl start docker",
//     "sudo systemctl enable docker",
//     "sudo chmod 666 /var/run/docker.sock",
//     "docker pull akarad158/cs230_worker:ubuntu_v2",
//     "docker run -p 8080:8080 -d akarad158/cs230_worker:ubuntu_v2"
// ];

let startScript = '#!/bin/bash\n' +
    'docker run -p 8080:8080 -d akarad158/cs230_worker:ubuntu_v2'


const startScriptBase64Encoded = Buffer.from(startScript).toString('base64');

exports.spawnEc2Instance = async() => {
    console.log("Spawning another ec2 instance!");
    try {
        const ec2Data = await ec2.describeInstances(params).promise();

        // Extract configuration from data
        const instanceConfig = ec2Data.Reservations[0].Instances[0];

        // Launch new instance using the configuration of the existing instance
        const launchParams = {
            ImageId: BASE_AMI_ID,
            InstanceType: instanceConfig.InstanceType,
            KeyName: instanceConfig.KeyName,
            MinCount: 1,
            MaxCount: 1,
            SecurityGroupIds: instanceConfig.SecurityGroups.map(group => group.GroupId),
            SubnetId: instanceConfig.SubnetId,
            TagSpecifications: [
                {
                    ResourceType: "instance",
                    Tags: [
                        {
                            Key: "Name",
                            Value: "Spawned Worker"
                        }
                    ]
                }
            ],
            UserData: startScriptBase64Encoded
        };
        const res = await ec2.runInstances(launchParams).promise();
        let instanceId = res.Instances[0].InstanceId;
        console.log("Created new instance on AWS with ID " + instanceId);
    }
    catch(err){
        console.log(err);
    }
}