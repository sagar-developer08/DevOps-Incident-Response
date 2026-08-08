import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  awsRegion: process.env.AWS_REGION || "us-east-1",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  bedrockModelId:
    process.env.BEDROCK_MODEL_ID || "amazon.nova-pro-v1:0",
  cloudwatchLogGroup: process.env.CLOUDWATCH_LOG_GROUP || "/devops/incident-demo",
  snsEscalationTopicArn: process.env.SNS_ESCALATION_TOPIC_ARN || "",
  ecsClusterName: process.env.ECS_CLUSTER_NAME || "",
  ecsServiceName: process.env.ECS_SERVICE_NAME || "",
};
