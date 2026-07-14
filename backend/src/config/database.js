import mongoose from "mongoose";

const DEFAULT_DATABASE_NAME = "karlo";

const getMongoUri = () => {
  const mongoUri = process.env.MONGO_URI?.trim();

  console.log(`[database] MONGO_URI loaded: ${Boolean(mongoUri)}`);

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in the backend .env file");
  }

  const [uriWithoutQuery, queryString] = mongoUri.split("?", 2);
  const databasePathMatch = uriWithoutQuery.match(
    /^mongodb(?:\+srv)?:\/\/[^/]+\/(.+)$/i
  );
  const databaseName = databasePathMatch?.[1];

  if (databaseName) {
    return mongoUri;
  }

  // Keep old connection strings working while making the selected database
  // explicit. No credentials or complete URI are ever written to the log.
  console.warn(
    `[database] MONGO_URI has no database name; using "${DEFAULT_DATABASE_NAME}"`
  );

  const separator = uriWithoutQuery.endsWith("/") ? "" : "/";

  return `${uriWithoutQuery}${separator}${DEFAULT_DATABASE_NAME}${
    queryString ? `?${queryString}` : ""
  }`;
};

export const connectDatabase = async () => {
  try {
    const connection = await mongoose.connect(getMongoUri());

    console.log(`[database] Connected database: ${connection.connection.name}`);
    console.log(`[database] Mongoose host: ${connection.connection.host}`);

    return connection;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);

    throw error;
  }
};
