import mongoose from "mongoose";
import { Service } from "../models/serviceModel.js";

export const getServices = async (req, res) => {
  try {
    const { category, popular, search } = req.query;

    const filter = {
      isActive: true,
    };

    if (category) {
      filter.category = category;
    }

    if (popular === "true") {
      filter.isPopular = true;
    }

    if (search) {
      filter.title = {
        $regex: search,
        $options: "i",
      };
    }

    const services = await Service.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[services API] Database: ${mongoose.connection.name}`);
    console.log(`[services API] Host: ${mongoose.connection.host}`);
    console.log(`[services API] Collection: ${Service.collection.name}`);
    console.log(`[services API] Matching services count: ${services.length}`);

    return res.status(200).json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to get services",
      error: error.message,
    });
  }
};

export const getServiceBySlug = async (req, res) => {
  try {
    const service = await Service.findOne({
      slug: req.params.slug,
      isActive: true,
    }).lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to get service",
      error: error.message,
    });
  }
};
