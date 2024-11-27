const User = require("../../models/user");

const initializeCollections = async () => {
  try {
    const userExists = await User.findOne();
    if (!userExists) {
      await new User({
        username: "admin",
        email: "admin@example.com",
        password:
          "$2a$10$ISbs3S7JkHv3IMPhkdaJVuFb515c1Vsn5nvcNVdd74gDvamS/wtuK",
        profile: {
          bio: "Fricking Bob bro....",
          profilePic: {},
        },
        group: {
          name: "The First",
          startTime: "2024-11-08T02:16:00.000+00:00",
          routes: [
            {
              start: {
                latitude: "-36.89204110000001",
                longitude: "174.618699",
              },
              end: {
                latitude: "-36.8885554",
                longitude: "174.6230991",
              },
              waypoints: [],
            },
          ],
        },
      }).save();
      console.log("'users' collection initialized with an initial user");
    }
  } catch (error) {
    console.error("Error initializing collections:", error);
    process.exit(1);
  }
};

module.exports = initializeCollections;
