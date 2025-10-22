db = db.getSiblingDB("citilink_demo");

db.createUser({
  user: "citilink_admin",
  pwd: "ecir2026",
  roles: [{ role: "readWrite", db: "citilink_demo" }]
});