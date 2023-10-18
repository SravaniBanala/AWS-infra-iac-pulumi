const pulumi = require('@pulumi/pulumi');

const aws = require('@pulumi/aws');

////const ip = require("ip");

///const { Address4 } = require('ip-address');

 

const config = new pulumi.Config();



//const awsRegion = config.get('aws-region');

var vpcCIDR = config.require('cidrBlock');

const publicCidrBlock = config.require('publicCidrBlock');

const tags = config.getObject('tags');

const amiOwner = config.require('amiOwner');

const amiName = config.require('amiName');

const debianAmi = aws.ec2.getAmi({



    mostRecent: true,

    filters: [

        {

            name: "name",

            values: [amiName],

        },

        {

            name: "virtualization-type",

            values: ["hvm"],

        },

    ],

    owners: [amiOwner],

});



aws.getAvailabilityZones({State :"available"}).then(availableZones => {

    const availabilityZones = availableZones.names.slice(0,3);

    const vpc = new aws.ec2.Vpc('my-vpc', {

        cidrBlock: vpcCIDR,

        enableDnsSupport: true,

        enableDnsHostnames: true,

        tags : {

            "Name" : "VPC CREATED FROM SCRIPT"

        }

    });
   

    const internetGw = new aws.ec2.InternetGateway("internetGw", {

        vpcId: vpc.id,

        tags: {

            Name: "createdGateway",

        },

    });

    
    const publicRouteTable = new aws.ec2.RouteTable('publicRouteTable', {

        vpcId: vpc.id,

        routes: [

            {

                cidrBlock: publicCidrBlock,

                gatewayId: internetGw.id,

            }],

        tags: {

            "Name" : "PublicRouteTable"

        },

      });
   

    const privateRouteTable = new aws.ec2.RouteTable('privateRouteTable', {

        vpcId: vpc.id, // Replace with your VPC ID

        tags: {

            "Name" : "PrivateRouteTable"

        },

      });

      

    console.log(availabilityZones);


    var i=1;

    const publicSubnets = [];

    const privateSubnets = [];

    

    availabilityZones.forEach((az, index) => {

        

        const thirdOctet = index + 1;

 

        const publicSubnetCIDR = `${vpcCIDR.split('.')[0]}.${vpcCIDR.split('.')[1]}.${thirdOctet}.0/24`;

        const privateSubnetCIDR = `${vpcCIDR.split('.')[0]}.${vpcCIDR.split('.')[1]}.${(parseInt(thirdOctet) * 10)}.0/24`;

 

        console.log(publicSubnetCIDR, privateSubnetCIDR)

 

 

        const publicSubnet = new aws.ec2.Subnet(`public-subnet-${az}`, {

            vpcId: vpc.id,

            cidrBlock: publicSubnetCIDR,

            availabilityZone: az,

            mapPublicIpOnLaunch: true,

            tags: {

                "Name" : `publicSubnet-${i}`

            },

        });

    

        const publicRouteTableAssociation = new aws.ec2.RouteTableAssociation(`publicRouteTableAssociation-${az}`, {

            subnetId: publicSubnet.id,

            routeTableId: publicRouteTable.id,

        });

 

        const privateSubnet = new aws.ec2.Subnet(`private-subnet-${az}`, {

            vpcId: vpc.id,

            cidrBlock: privateSubnetCIDR,

            availabilityZone: az,

            tags: {

                "Name" : `privateSubnet-${i}`

            },

        });

    

        const privateRouteTableAssociation = new aws.ec2.RouteTableAssociation(`privateRouteTableAssociation-${az}`, {

            subnetId: privateSubnet.id,

            routeTableId: privateRouteTable.id,

        });

 

        publicSubnets.push(publicSubnet.id);

        privateSubnets.push(privateSubnet.id);

        i=i+1;

    });

 

    //Creating Security Group for Ec2 Instance
    //console.log(publicSubnets, privateSubnets)
    const MyApplicationSecurityGroup = new aws.ec2.SecurityGroup('MyApplicationSecurityGroup', {

        vpcId: vpc.id,

        ingress: [

            {

                protocol: "tcp",

                fromPort: 22,

                toPort: 22,

                cidrBlocks: ["0.0.0.0/0"],

            },

            {

                protocol: "tcp",

                fromPort: 80,

                toPort: 80,

                cidrBlocks: ["0.0.0.0/0"],

            },

            {

                protocol: "tcp",

                fromPort: 443,

                toPort: 443,

                cidrBlocks: ["0.0.0.0/0"],

            },

            {

                protocol: "tcp",

                fromPort: 8087, //APP_PORT

                toPort: 8087,

                cidrBlocks: ["0.0.0.0/0"],

            },

        ],



    });




    //Ec2 instances will be created in Vpc created above 
    const ec2Instance = new aws.ec2.Instance("myEC2Instance", {

        //sets the Amazon Machine Image (AMI) for the EC2 instance.
        ami: debianAmi.then(debianAmi => debianAmi.id),

        //instance type for small 
        instanceType: "t2.micro",

        //Associates the EC2 instance with VPC 
        vpc: vpc.id,

        //Specifies the subnet in which the EC2 instance should be launched
        //subnetId: privateSubnets[0],
        subnetId: publicSubnets[0],

        keyName: "mywebapp",

        //Assigns the EC2 instance to the security group
        vpcSecurityGroupIds: [MyApplicationSecurityGroup.id],

        rootBlockDevice: {

            volumeSize: 25,

            volumeType: "gp2",

            deleteOnTermination: true,

        },

        // Add this to protect against accidental termination.
        disableApiTermination: false,


    });

});
