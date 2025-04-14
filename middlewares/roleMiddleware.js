export const adminOnly = (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied, admin only" });
    }
    next();
  };
  
  export const customerOnly = (req, res, next) => {
    if (req.user.role !== "customer") {
      return res.status(403).json({ error: "Access denied, customer only" });
    }
    next();
  };
  