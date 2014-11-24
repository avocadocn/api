module.exports = {
  "User": {
    "id": "User",
    "required": ["_id", "email"],
    "properties": {
      "_id": {
        "type": "string",
        "description": "user id"
      },
      "email": {
        "type": "string",
        "description": "user email"
      }
    }
  }
}