const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


const cache = new Map();


const api = axios.create({
    timeout: 10000,
    headers: {
        "User-Agent": "Mozilla/5.0 Roblox-API"
    }
});


// GET request có chống 429
async function robloxGet(url) {

    let retry = 0;

    while (retry < 3) {

        try {

            return await api.get(url);

        } catch (err) {

            if (err.response?.status === 429) {

                retry++;

                await new Promise(
                    r => setTimeout(r, 3000)
                );

            } else {

                throw err;

            }

        }

    }

    throw new Error("Roblox rate limited");

}



// POST request có header
async function robloxPost(url, body) {

    let retry = 0;


    while (retry < 3) {

        try {

            return await axios.post(
                url,
                body,
                {
                    timeout:10000,
                    headers:{
                        "Content-Type":"application/json",
                        "User-Agent":"Mozilla/5.0 Roblox-API"
                    }
                }
            );


        } catch(err) {


            if(err.response?.status === 429){

                retry++;

                await new Promise(
                    r=>setTimeout(r,3000)
                );


            } else {

                throw err;

            }

        }

    }


    throw new Error("Roblox rate limited");

}





async function getUserId(username){


    const result = await robloxPost(

        "https://users.roblox.com/v1/usernames/users",

        {
            usernames:[
                username.trim()
            ],

            excludeBannedUsers:false
        }

    );



    if(
        !result.data.data ||
        result.data.data.length === 0
    ){

        throw new Error(
            "User not found"
        );

    }


    return result.data.data[0].id;

}




function accountAge(date){


    const days = Math.floor(

        (Date.now() - new Date(date))

        /

        (1000*60*60*24)

    );


    return {

        days:days,

        years:
        `${Math.floor(days/365)} years`

    };

}





app.get("/",(req,res)=>{


    res.json({

        success:true,

        api:"Roblox User API",

        version:"3.1"

    });


});






app.get("/roblox",async(req,res)=>{


try{


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



    // Lấy followers
    try{

        const f =
        await robloxGet(
        `https://friends.roblox.com/v1/users/${id}/followers/count`
        );

        followers =
        f.data.count;


    }catch(e){}





    // Lấy following
    try{

        const f =
        await robloxGet(
        `https://friends.roblox.com/v1/users/${id}/followings/count`
        );

        following =
        f.data.count;


    }catch(e){}







    // Presence không bắt buộc

    try{


        const p =
        await robloxPost(

        "https://presence.roblox.com/v1/presence/users",

        {
            userIds:[id]
        }

        );



        const data =
        p.data.userPresences[0];



        if(data){

            presence={

                online:
                data.userPresenceType !== 0,


                place:
                data.lastLocation || "Offline"

            };

        }


    }catch(e){}








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
                accountAge(data.created)

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


            version:"3.1",


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




}catch(err){



    console.log(
        err.response?.data || err.message
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
