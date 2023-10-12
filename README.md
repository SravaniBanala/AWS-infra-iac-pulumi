# iac-pulumi
Assignment 4 - Sravani Banala
Description
This Pulumi code creates a Virtual Private Cloud (VPC) in AWS and creates 3 public and 3 private subnets in different availability zones in the same region. It also creates an Internet Gateway, public and private route tables, and a public route in the public route table. It also creates a EC2 instance with neccessary security groups

Instructions
Open the terminal and navigate to the project directory.

Run pulumi up to initialize the project and download necessary plugins.

Run pulumi destroy to destroy the VPC

Run pulumi refresh to refresh for the updated changes