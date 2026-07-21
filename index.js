const express = require("express");
const axios = require("axios");

const app = express();

app.get("/", (req, res) => {
    res.send("Roblox API Online");
});


app.get("/roblox", async (req, res) => {

    try {

        const username = req.query.username;

        if (!username) {
            return res.json({
                success:false,
                error:"Missing username"
            });
        }


        // Tìm user

        const search = await axios.get(
            "https://users.roblox.com/v1/users/search",
            {
                params:{
                    keyword:username,
                    limit:10
                }
            }
        );


        if (!search.data.data.length) {

            return res.json({
                success:false,
                error:"User not found"
            });

        }


        const id = search.data.data[0].id;


        // Thông tin user

        const user = (
            await axios.get(
                `https://users.roblox.com/v1/users/${id}`
            )
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



        // Username cũ

        let oldNames = [];

        try {

            const history = await axios.get(
                `https://users.roblox.com/v1/users/${id}/username-history`
            );

            oldNames = history.data.data.map(
                x => x.name
            );

        } catch(e){}



        // Groups

        let groups = 0;

        try {

            const groupData = await axios.get(
                `https://groups.roblox.com/v2/users/${id}/groups/roles`
            );

            groups = groupData.data.data.length;

        } catch(e){}



        // Badges

        let badges = 0;

        try {

            const badgeData = await axios.get(
                `https://badges.roblox.com/v1/users/${id}/badges`,
                {
                    params:{
                        limit:10
                    }
                }
            );

            badges = badgeData.data.data.length;

        } catch(e){}




        // Tuổi tài khoản

        const createdDate = new Date(user.created);

        const now = new Date();

        let age = now.getFullYear() - createdDate.getFullYear();


        if (
            now.getMonth() < createdDate.getMonth()
            ||
            (
                now.getMonth() === createdDate.getMonth()
                &&
                now.getDate() < createdDate.getDate()
            )
        ){
            age--;
        }




        res.json({

            success:true,

            id:id,

            username:user.name,

            displayName:user.displayName,


            description:
            user.description || 
            "Người dùng chưa thêm mô tả.",


            verified:user.hasVerifiedBadge,


            created:user.created,


            accountAge:
            age + " năm",


            followers:followers,

            friends:friends,

            following:following,


            avatar:avatar,


            oldNames:oldNames,


            groups:groups,


            badges:badges,


            profile:
            `https://www.roblox.com/users/${id}/profile`

        });



    } catch(err){


        res.status(500).json({

            success:false,

            error:err.message

        });


    }

});



const PORT = process.env.PORT || 3000;


app.listen(PORT,()=>{

    console.log(
        "Roblox API running on " + PORT
    );

});
