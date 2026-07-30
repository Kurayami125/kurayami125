const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


const cache = new Map();


app.get("/", (req,res)=>{
    res.json({
        status:"online",
        api:"Roblox API",
        version:"2.0"
    });
});



async function getUserId(username){

    const r = await axios.post(
        "https://users.roblox.com/v1/usernames/users",
        {
            usernames:[username],
            excludeBannedUsers:true
        }
    );

    if(!r.data.data.length)
        throw new Error("User not found");

    return r.data.data[0].id;
}



function accountAge(date){

    const created = new Date(date);
    const now = new Date();

    const days = Math.floor(
        (now-created)
        /
        (1000*60*60*24)
    );

    const years = Math.floor(days/365);

    return {
        days:days,
        years:`${years} years`
    };
}




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



// cache 5 phút

if(cache.has(username)){

return res.json(cache.get(username));

}




const id = await getUserId(username);



const [

user,

avatar,

friends,

followers,

following,

groups,

badges,

history,

presence

] = await Promise.all([


axios.get(
`https://users.roblox.com/v1/users/${id}`
),


axios.get(
`https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png`
),


axios.get(
`https://friends.roblox.com/v1/users/${id}/friends/count`
),


axios.get(
`https://friends.roblox.com/v1/users/${id}/followers/count`
),


axios.get(
`https://friends.roblox.com/v1/users/${id}/followings/count`
),


axios.get(
`https://groups.roblox.com/v2/users/${id}/groups/roles`
),



axios.get(
`https://badges.roblox.com/v1/users/${id}/badges?limit=100&sortOrder=Desc`
),



axios.get(
`https://users.roblox.com/v1/users/${id}/username-history?limit=50`
),



axios.post(
"https://presence.roblox.com/v1/presence/users",
{
userIds:[id]
}
)

]);





const data=user.data;



const result={


success:true,


user:{


id:id,


username:data.name,


displayName:data.displayName,


description:data.description,


verified:data.hasVerifiedBadge,



created:{

raw:data.created,

age:accountAge(data.created)

},



avatar:{

full:
avatar.data.data[0].imageUrl,

headshot:
`https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=420&height=420&format=png`

},



statistics:{


followers:
followers.data.count,


friends:
friends.data.count,


following:
following.data.count

},



presence:{


online:
presence.data.userPresences[0]?.userPresenceType !== 0,


place:
presence.data.userPresences[0]?.lastLocation || "Offline"

},



groups:

groups.data.data.map(g=>({

name:g.group.name,

rank:g.role.name

})),




badges:

badges.data.data
.slice(0,50)
.map(b=>b.name),




usernameHistory:

history.data.data.map(x=>x.name),




profile:
`https://www.roblox.com/users/${id}/profile`



},



api:{


version:"2.0",


responseTime:
Date.now()-start+"ms"


}



};




cache.set(username,result);



setTimeout(()=>{

cache.delete(username)

},300000);




res.json(result);



}catch(err){


console.log(
err.response?.data || err.message
);


res.status(404).json({

success:false,

error:err.message

});


}


});





const PORT=process.env.PORT || 3000;


app.listen(PORT,()=>{

console.log(
`Roblox API running : ${PORT}`
);

});
