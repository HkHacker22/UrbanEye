const ServiceCenter = require('../models/ServiceCenter');
const { mapCategoryToTargetType } = require('../utils/deptMapper');

/**
 * Assigns an issue to the nearest specific service center based on Haversine distance and operational type.
 * @param {Array} coordinates - [Longitude, Latitude] of the issue.
 * @param {string} category - Issue category classified by Gemini.
 * @returns {Object} { name, type } of the closest spatial unit.
 */
const assignDepartment = async (coordinates, category) => {
  try {
    const targetType = mapCategoryToTargetType(category);
    const locationPoint = { type: 'Point', coordinates };

    const centers = await ServiceCenter.find({
      type: targetType,
      location: {
        $near: {
          $geometry: locationPoint,
          $maxDistance: 50000 // 50km radius
        }
      }
    }).limit(1);

    if (centers && centers.length > 0) {
      return {
        name: centers[0].name,
        type: centers[0].type
      };
    }
    
    // Safety fallback
    return { name: "Central Municipal Hub", type: targetType };
  } catch (error) {
    console.error("GeoRouting Calculation Failure:", error);
    return { name: "Central Municipal Hub", type: "Infrastructure" };
  }
};

module.exports = { assignDepartment };
