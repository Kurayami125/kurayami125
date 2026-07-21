const express = require("express");
const axios = require("axios");

const app = express();

app.get("/", (req, res) => {
    res.send("Roblox API Online");
});

app.get("/roblox", async (req, res) => {
    try {

        const username = req.query.username;

        if (!username)
            return res.status(400).json({
                success: false,
                error: "Missing username"
            });

        // Search User

        const search = await axios.get(
            `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`
        );

        if (!search.data.data.length)
            return res.json({
                success: false,
                error: "User not found"
            });

        const id = search.data.data[0].id;

        // User

        const user = (
            await axios.get(`https://users.roblox.com/v1/users/${id}`)
        ).data;

        // Followers

        const followers = (
            await axios.get(
                `https://friends.roblox.com/v1/users/${id}/followers/count`
            )
        ).data.count;

        // Friends

        const friends = (
            await axios.get(
                `https://friends.roblox.com/v1/users/${id}/friends/count`
            )
        ).data.count;

        // Following

        const following = (
            await axios.get(
                `https://friends.roblox.com/v1/users/${id}/followings/count`
            )
        ).data.count;

        // Avatar

        const avatar = (
            await axios.get(
                `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=352x352&format=Png&isCircular=false`
            )
        ).data.data[0].imageUrl;

        res.json({
            success: true,

            id,

            username: user.name,

            displayName: user.displayName,

            description:
                user.description || "Người dùng chưa thêm mô tả.",

            verified: user.hasVerifiedBadge,

            created: user.created,

            followers,

            friends,

            following,

            avatar,

            profile: `https://www.roblox.com/users/${id}/profile`
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
    console.log("Server running on " + PORT)
); 
