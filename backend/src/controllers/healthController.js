export const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Karlo Services API is working",
    data: {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
};