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
        "User-Agent": "Roblox-API"
    }
});



// Request Roblox chống 429

async function request(url, options = {}) {

    let tries = 0;


    while (tries < 3) {

        try {

            return await api.get(url, options);


        } catch (err) {


            if (err.response?.status === 429) {

                tries++;

                await new Promise(
                    r => setTimeout(r, 3000)
                );

            } else {

                throw err;

            }

        }

    }


    throw new Error("Roblox rate limit");

}




async function getUserId(username) {


    const res = await axios.post(

        "https://users.roblox.com/v1/usernames/users",

        {
            usernames:[
                username.trim()
            ],

            excludeBannedUsers:false
        },

        {
            headers:{
                "Content-Type":"application/json"
            }
        }

    );



    if(
        !res.data.data ||
        !res.data.data.length
    ){

        throw new Error(
            "User not found"
        );

    }


    return res.data.data[0].id;

}




function age(date){


    const days = Math.floor(

        (Date.now() - new Date(date))

        /

        (1000 * 60 * 60 * 24)

    );


    return {

        days,

        years:
        `${Math.floor(days / 365)} years`

    };

}




app.get("/",(req,res)=>{

    res.json({

        online:true,

        name:"Roblox API v3",

        version:"3.0"

    });

});





app.get("/roblox", async(req,res)=>{


try{


const start = Date.now();


const username = req.query.username;



if(!username){

return res.json({

success:false,

error:"Missing username"

});

}




const key=username.toLowerCase();



if(cache.has(key)){


return res.json(
cache.get(key)
);


}




const id = await getUserId(username);





// Chỉ 6 request Roblox

const [

user,

avatar,

friends,

groups,

badges,

presence

] = await Promise.all([




request(
`https://users.roblox.com/v1/users/${id}`
),




request(
`https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png`
),




request(
`https://friends.roblox.com/v1/users/${id}/friends/count`
),




request(
`https://groups.roblox.com/v2/users/${id}/groups/roles`
),




request(
`https://badges.roblox.com/v1/users/${id}/badges?limit=20&sortOrder=Desc`
),




axios.post(

"https://presence.roblox.com/v1/presence/users",

{
userIds:[id]
}

)


]);





const data=user.data;





// followers / following ít quan trọng hơn
// lấy riêng để tránh spam
let followers=0;
let following=0;


try {


const f1 = await request(
`https://friends.roblox.com/v1/users/${id}/followers/count`
);


followers=f1.data.count;



const f2 = await request(
`https://friends.roblox.com/v1/users/${id}/followings/count`
);


following=f2.data.count;



}catch(e){}







const result={


success:true,


user:{



id:id,


username:data.name,


displayName:data.displayName,


description:
data.description || "Không có mô tả",



verified:
data.hasVerifiedBadge,



created:{


raw:data.created,


age:
age(data.created)

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
g=>`${g.group.name} (${g.role.name})`
)
.join("\n")

:

"Không có group",





badges:


badges.data.data.length

?

badges.data.data
.map(
b=>`🏅 ${b.name}`
)
.join("\n")

:

"Không có badge",






presence:{


online:

presence.data.userPresences[0]
?.userPresenceType !== 0,



place:

presence.data.userPresences[0]
?.lastLocation || "Offline"


},






profile:

`https://www.roblox.com/users/${id}/profile`



},




api:{


version:"3.0",


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


console.log(err.message);



res.json({

success:false,

error:err.message

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
