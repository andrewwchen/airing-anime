// contains token: must create your own in order to use. instructions below:
// https://www.katsurin.com/docs/anilist-node/index.html
const helpers = require('./helpers.js');
const AmazonDateParser = require('amazon-date-parser');
const anilist = require('anilist-node');
const Anilist = new anilist(/*settings.token*/);



module.exports = {

    // takes Amazon Date object, returns string
    async getAiringAnimeOnDate(date) {
        
        try {
            const startDate = new AmazonDateParser(date).startDate;
            const endDate = new AmazonDateParser(date).endDate;

            // userLists is an Array.<UserLists>
            // must be narrowed down to the current list
            let userLists = await helpers.getAnimeList("airinganime");

            const userListsLength = userLists.length;
            let currentList
            let i;
            for (i = 0; i < userListsLength; i++) {
                if (userLists[i].status === "CURRENT") {
                    currentList = userLists[i].entries;
                    break
                }
            }
                
            // currentList is an Array.<ListEntry>
            // each episode of each entry must be verified to be currently airing
            // by cross checking ListEntry objects against AnimeEntry objects
            // each AnimeEntry's list of episodes will be checked for matches against the submitted date
            // creates an array of literals in format: {anime: String, episode: String, date: Date(), timeUntil: Number (in seconds)}
            const currentListLength = userLists.length;
            let currentAiringEpisodesList = [];
            let promises = []; // list of promises to settle before proceeding
            for (i = 0; i < currentListLength; i++) {
                let currentAnime = await helpers.getAnime(currentList[i].media.id)
                const animeTitle = currentAnime.title.english/*userPreferred*/;
                const currentAnimeAiringSchedule = currentAnime.airingSchedule;
                const currentAnimeAiringScheduleLength = currentAnimeAiringSchedule.length;
                let j;
                for (j = 0; j < currentAnimeAiringScheduleLength; j++) {
                    const episodeDate = new Date(currentAnimeAiringSchedule[j].airingAt * 1000);
                    if (startDate <= episodeDate && episodeDate <= endDate) {
                        const episodeNumber = currentAnimeAiringSchedule[j].episode;
                        const timeUntil = currentAnimeAiringSchedule[j].timeUntilAiring;
                        currentAiringEpisodesList.push({anime: animeTitle, episode: episodeNumber, date: episodeDate, timeUntil: timeUntil});
                    }
                }  
            }

            console.log("successfully retrieved airing anime");
            // array of literals in format: {anime: String, episode: String, date: Date(), timeUntil: Number (in seconds)}
            return currentAiringEpisodesList;
        
        } catch(err) {
            console.log("unable to retrieve airing anime");
            console.log(err.toString());
            return [];
        }
    }
    
    
}

