const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());


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

        const search = await axios.post(
            "https://users.roblox.com/v1/usernames/users",
            {
                usernames:[
                    username
                ],
                excludeBannedUsers:true
            }
        );



        if (!search.data.data.length) {

            return res.json({
                success:false,
                error:"User not found"
            });

        }



        const id =
        search.data.data[0].id;





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
                `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png&isCircular=false`
            )
        ).data.data[0].imageUrl;







        // Groups

        let groups = 0;

        try {

            const groupData = await axios.get(
                `https://groups.roblox.com/v2/users/${id}/groups/roles`
            );


            groups =
            groupData.data.data.length;


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


            badges =
            badgeData.data.data.length;


        } catch(e){}







        // Tuổi tài khoản

        const createdDate =
        new Date(user.created);


        const now =
        new Date();



        let years =
        now.getFullYear()
        -
        createdDate.getFullYear();



        let months =
        now.getMonth()
        -
        createdDate.getMonth();



        let days =
        now.getDate()
        -
        createdDate.getDate();





        if(days < 0){

            months--;

            const lastMonth =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                0
            );


            days += lastMonth.getDate();

        }





        if(months < 0){

            years--;

            months += 12;

        }




        let age = [];



        if(years > 0){

            age.push(
                years + " năm"
            );

        }



        if(months > 0){

            age.push(
                months + " tháng"
            );

        }



        if(days > 0){

            age.push(
                days + " ngày"
            );

        }



        age =
        age.join(" ");








        res.json({

            success:true,


            id:id,


            username:
            user.name,


            displayName:
            user.displayName,



            description:
            user.description ||
            "Người dùng chưa thêm mô tả.",



            verified:
            user.hasVerifiedBadge,



            created:
            user.created,



            accountAge:
            age,



            followers:
            followers,



            friends:
            friends,



            following:
            following,



            avatar:
            avatar,



            groups:
            groups,



            badges:
            badges,



            profile:
            `https://www.roblox.com/users/${id}/profile`

        });



    } catch(err) {


        console.log(
            err.response?.data || err.message
        );


        res.status(500).json({

            success:false,

            error:
            err.message

        });


    }

});






const PORT =
process.env.PORT || 3000;



app.listen(PORT,()=>{

    console.log(
        "Roblox API running on " + PORT
    );

});
