const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ===============================
            CONFIG
================================ */

const CACHE_TIME = 60000; // 60 giây
const REQUEST_TIMEOUT = 10000;
const MAX_RETRY = 3;

/* ===============================
            AXIOS
================================ */

const http = axios.create({
    timeout: REQUEST_TIMEOUT,
    headers: {
        "User-Agent": "Kurayami125 Roblox API v2"
    }
});

/* ===============================
            CACHE
================================ */

const cache = new Map();

function getCache(key){

    const item = cache.get(key);

    if(!item) return null;

    if(Date.now() > item.expire){

        cache.delete(key);

        return null;

    }

    return item.data;

}

function setCache(key,data,time=CACHE_TIME){

    cache.set(key,{
        data,
        expire:Date.now()+time
    });

}

/* ===============================
          RETRY REQUEST
================================ */

async function request(url,config={}){

    let error;

    for(let i=0;i<MAX_RETRY;i++){

        try{

            return (await http.get(url,config)).data;

        }catch(err){

            error=err;

            const status=err.response?.status;

            if(status===429){

                await sleep(1000*(i+1));

                continue;

            }

            if(status>=500){

                await sleep(500);

                continue;

            }

            throw err;

        }

    }

    throw error;

}

/* ===============================
        POST REQUEST
================================ */

async function post(url,data,config={}){

    let error;

    for(let i=0;i<MAX_RETRY;i++){

        try{

            return (await http.post(url,data,config)).data;

        }catch(err){

            error=err;

            const status=err.response?.status;

            if(status===429){

                await sleep(1000*(i+1));

                continue;

            }

            if(status>=500){

                await sleep(500);

                continue;

            }

            throw err;

        }

    }

    throw error;

}

/* ===============================
            SLEEP
================================ */

function sleep(ms){

    return new Promise(resolve=>setTimeout(resolve,ms));

}

/* ===============================
      ACCOUNT AGE FORMAT
================================ */

function formatAge(created){

    const createdDate=new Date(created);

    const now=new Date();

    let years=now.getFullYear()-createdDate.getFullYear();

    let months=now.getMonth()-createdDate.getMonth();

    let days=now.getDate()-createdDate.getDate();

    if(days<0){

        months--;

        const lastMonth=new Date(
            now.getFullYear(),
            now.getMonth(),
            0
        );

        days+=lastMonth.getDate();

    }

    if(months<0){

        years--;

        months+=12;

    }

    const age=[];

    if(years>0) age.push(`${years} năm`);

    if(months>0) age.push(`${months} tháng`);

    if(days>0) age.push(`${days} ngày`);

    return age.join(" ");

}

/* ===============================
         HEALTH CHECK
================================ */

app.get("/",(req,res)=>{

    res.json({

        success:true,

        name:"Kurayami Roblox API",

        version:"2.0.0",

        cache:CACHE_TIME/1000+"s",

        status:"online",

        timestamp:new Date()

    });

});
/* ===============================
            ROBLOX ROUTE
================================ */

app.get("/roblox", async (req, res) => {

    try {

        const username = req.query.username?.trim();

        if (!username) {
            return res.json({
                success: false,
                error: "Missing username"
            });
        }

        const cacheKey = username.toLowerCase();

        const cached = getCache(cacheKey);

        if (cached) {
            return res.json(cached);
        }

        /* ===============================
              USER SEARCH
        ============================== */

        const search = await post(
            "https://users.roblox.com/v1/usernames/users",
            {
                usernames: [username],
                excludeBannedUsers: false
            }
        );

        if (!search.data.length) {
            return res.json({
                success: false,
                error: "User not found"
            });
        }

        const id = search.data[0].id;

        /* ===============================
               LOAD EVERYTHING
        ============================== */

        const [

            user,

            followers,

            friends,

            following,

            avatar,

            headshot,

            bust,

            fullBody,

            history,

            groupsData

        ] = await Promise.all([

            request(
                `https://users.roblox.com/v1/users/${id}`
            ),

            request(
                `https://friends.roblox.com/v1/users/${id}/followers/count`
            ),

            request(
                `https://friends.roblox.com/v1/users/${id}/friends/count`
            ),

            request(
                `https://friends.roblox.com/v1/users/${id}/followings/count`
            ),

            request(
                `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png&isCircular=false`
            ),

            request(
                `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=720x720&format=Png&isCircular=false`
            ),

            request(
                `https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${id}&size=720x720&format=Png&isCircular=false`
            ),

            request(
                `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png`
            ),

            request(
                `https://users.roblox.com/v1/users/${id}/username-history`
            ).catch(() => ({ data: [] })),

            request(
                `https://groups.roblox.com/v2/users/${id}/groups/roles`
            ).catch(() => ({ data: [] }))

        ]);

        /* ===============================
              USERNAME HISTORY
        ============================== */

        const oldNames = history.data.map(x => x.name);

        /* ===============================
                  GROUP COUNT
        ============================== */

        const groups = groupsData.data.length;

        /* ===============================
                  AVATARS
        ============================== */

        const avatarUrl =
            avatar.data[0]?.imageUrl || null;

        const headshotUrl =
            headshot.data[0]?.imageUrl || null;

        const bustUrl =
            bust.data[0]?.imageUrl || null;

        const fullBodyUrl =
            fullBody.data[0]?.imageUrl || null;

        /* ===============================
                 ACCOUNT AGE
        ============================== */

        const accountAge =
            formatAge(user.created);

        /* ===============================
            BADGES
================================ */

let badges = [];

try {

    const badgeData = await request(
        `https://badges.roblox.com/v1/users/${id}/badges?limit=100&sortOrder=Asc`
    );

    const badgeList = badgeData.data || [];

    if (badgeList.length > 0) {

        const badgeIds = badgeList
            .map(x => x.id)
            .join(",");

        const badgeThumb = await request(
            `https://thumbnails.roblox.com/v1/badges/icons?badgeIds=${badgeIds}&size=150x150&format=Png`
        );

        badges = badgeList.map(badge => {

            const icon = badgeThumb.data.find(
                x => x.targetId === badge.id
            );

            return {

                id: badge.id,

                name: badge.name,

                description:
                    badge.description ||
                    "Không có mô tả.",

                icon:
                    icon?.imageUrl || null

            };

        });

    }

} catch {

    badges = [];

}
        /* ===============================
        RESPONSE OBJECT
================================ */

const response = {

    success: true,

    id,

    username: user.name,

    displayName: user.displayName,

    description:
        user.description ||
        "Người dùng chưa thêm mô tả.",

    verified:
        user.hasVerifiedBadge,

    created:
        user.created,

    accountAge,

    followers:
        followers.count,

    friends:
        friends.count,

    following:
        following.count,

    avatar:
        avatarUrl,

    headshot:
        headshotUrl,

    bust:
        bustUrl,

    fullBody:
        fullBodyUrl,

    oldNames,

    groups,

    badges,

    profile:
        `https://www.roblox.com/users/${id}/profile`

};
        /* ===============================
        SAVE CACHE
================================ */

setCache(
    cacheKey,
    response
);

return res.json(
    response
);

} catch(err){

    console.error(err);

    return res.status(500).json({

        success:false,

        error:err.message

    });

}

});
