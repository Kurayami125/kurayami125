const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


const cache = new Map();


const http = axios.create({
    timeout: 10000,
    headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
    }
});



// GET Roblox API + chống 429
async function robloxGet(url) {

    for (let i = 0; i < 3; i++) {

        try {

            return await http.get(url);

        } catch (err) {


            if (err.response?.status === 429) {

                await new Promise(
                    r => setTimeout(r, 3000)
                );

                continue;

            }


            throw err;

        }

    }


    throw new Error("Roblox rate limit");

}




// POST Roblox API
async function robloxPost(url, body) {

    for (let i = 0; i < 3; i++) {

        try {

            return await axios.post(
                url,
                body,
                {
                    timeout:10000,
                    headers:{
                        "User-Agent":"Mozilla/5.0",
                        "Content-Type":"application/json",
                        "Accept":"application/json"
                    }
                }
            );


        } catch(err) {


            if(err.response?.status === 429){

                await new Promise(
                    r=>setTimeout(r,3000)
                );

                continue;

            }


            throw err;

        }

    }


    throw new Error("Roblox rate limit");

}




// lấy ID Roblox

async function getUserId(username){


    const res = await robloxPost(

        "https://users.roblox.com/v1/usernames/users",

        {
            usernames:[
                username.trim()
            ],

            excludeBannedUsers:false
        }

    );



    if(
        !res.data.data ||
        res.data.data.length === 0
    ){

        throw new Error(
            "User not found"
        );

    }


    return res.data.data[0].id;

}





function getAge(date){


    const days = Math.floor(

        (Date.now() - new Date(date))
        /
        (1000*60*60*24)

    );


    return {

        days,

        years:
        `${Math.floor(days/365)} years`

    };

}





app.get("/",(req,res)=>{

    res.json({

        success:true,

        api:"Roblox API",

        version:"4.0"

    });

});






app.get("/roblox", async(req,res)=>{


    try {


        const start = Date.now();


        const username = req.query.username;



        if(!username){

            return res.json({

                success:false,

                error:"Missing username"

            });

        }





        const key =
        username.toLowerCase();



        if(cache.has(key)){

            return res.json(
                cache.get(key)
            );

        }




        const id =
        await getUserId(username);





        const [
            user,
            avatar,
            friends,
            groups,
            badges
        ] = await Promise.all([


            robloxGet(
            `https://users.roblox.com/v1/users/${id}`
            ),


            robloxGet(
            `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png`
            ),


            robloxGet(
            `https://friends.roblox.com/v1/users/${id}/friends/count`
            ),


            robloxGet(
            `https://groups.roblox.com/v2/users/${id}/groups/roles`
            ),


            robloxGet(
            `https://badges.roblox.com/v1/users/${id}/badges?limit=20&sortOrder=Desc`
            )


        ]);







        let followers = 0;

        let following = 0;


        let presence = {

            online:false,

            place:"Offline"

        };




        // followers

        try {

            const data =
            await robloxGet(
            `https://friends.roblox.com/v1/users/${id}/followers/count`
            );


            followers =
            data.data.count;


        }catch(e){}





        // following

        try {


            const data =
            await robloxGet(
            `https://friends.roblox.com/v1/users/${id}/followings/count`
            );


            following =
            data.data.count;


        }catch(e){}







        // presence không bắt buộc

        try {


            const p =
            await robloxPost(

            "https://presence.roblox.com/v1/presence/users",

            {
                userIds:[
                    id
                ]
            }

            );



            const info =
            p.data.userPresences[0];



            if(info){

                presence={

                    online:
                    info.userPresenceType !== 0,


                    place:
                    info.lastLocation || "Offline"

                };

            }


        }catch(e){

            console.log(
            "Presence error:",
            e.message
            );

        }








        const data =
        user.data;




        const result = {


            success:true,


            user:{



                id:id,


                username:
                data.name,


                displayName:
                data.displayName,


                description:
                data.description ||
                "Không có mô tả",



                verified:
                data.hasVerifiedBadge,





                created:{


                    raw:
                    data.created,


                    age:
                    getAge(data.created)


                },






                avatar:{


                    full:
                    avatar.data.data[0]?.imageUrl || "",



                    headshot:
                    `https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=420&height=420&format=png`

                },








                statistics:{


                    followers,


                    friends:
                    friends.data.count,


                    following


                },







                groups:


                groups.data.data.length

                ?


                groups.data.data
                .map(
                    g =>
                    `${g.group.name} (${g.role.name})`
                )
                .join("\n")


                :

                "Không có group",







                badges:


                badges.data.data.length

                ?


                badges.data.data
                .map(
                    b =>
                    `🏅 ${b.name}`
                )
                .join("\n")


                :

                "Không có badge",






                presence,







                profile:
                `https://www.roblox.com/users/${id}/profile`



            },





            api:{


                version:"4.0",


                responseTime:
                `${Date.now()-start}ms`


            }



        };






        cache.set(
            key,
            result
        );



        setTimeout(()=>{

            cache.delete(key);

        },1800000);






        res.json(result);




    } catch(err){



        console.log(
            "ERROR:",
            err.response?.status,
            err.config?.url,
            err.message
        );



        res.json({

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
        `Roblox API running on ${PORT}`
    );

});
