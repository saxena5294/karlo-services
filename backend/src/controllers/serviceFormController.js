import { Service } from "../models/serviceModel.js";
import { ServiceForm } from "../models/serviceFormModel.js";

export const getServiceForm = async (req, res) => {
  try {
    const service = await Service.findOne({ slug: req.params.slug, isActive: true }).lean();

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const form = await ServiceForm.findOne({ service: service._id, isActive: true }).lean();

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Application form is not configured for this service",
      });
    }

    form.sections = [...(form.sections || [])].sort((left, right) => left.order - right.order);
    form.fields = [...form.fields].sort((left, right) => left.order - right.order);

    return res.status(200).json({ success: true, service, form });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to get form configuration" });
  }
};
