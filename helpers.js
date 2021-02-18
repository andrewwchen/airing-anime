const anilist = require('anilist-node');
const Anilist = new anilist(/*settings.token*/);

module.exports = {
    getAnimeList(nameOrID) {
        return Anilist.lists.anime(nameOrID)
    },

    
    getAnime(ID) {
        return Anilist.media.anime(ID)
    },

    amazonifyDate(date) {
        // from https://stackoverflow.com/questions/3552461/how-to-format-a-javascript-date
        const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
        const mo = new Intl.DateTimeFormat('en', { month: 'numeric' }).format(date);
        const da = new Intl.DateTimeFormat('en', { day: 'numeric' }).format(date);
        return (`${ye}-${mo}-${da}`);
    },

    stringifyDate(date) {
        // from https://stackoverflow.com/questions/3552461/how-to-format-a-javascript-date
        const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
        const mo = new Intl.DateTimeFormat('en', { month: 'long' }).format(date);
        const da = new Intl.DateTimeFormat('en', { day: 'numeric' }).format(date);
        return (`${mo} ${da}`);
        //return (`${da}-${mo}-${ye}`);
    },


    stringifySeconds(seconds) {
        // from https://stackoverflow.com/questions/36098913/convert-seconds-to-days-hours-minutes-and-seconds
        var secs = parseInt(seconds, 10);
        var days = Math.floor(secs / (3600*24));
        secs  -= days*3600*24;
        var hrs   = Math.floor(secs / 3600);
        secs  -= hrs*3600;
        var mnts = Math.floor(secs / 60);
        secs  -= mnts*60;

        var returnStatement = "";
        var started = false;
        if (days !==0) {
            returnStatement += (days+" days");
            started = true;
        }
        if (hrs !== 0) {
            if (started) {
                returnStatement += ", ";
            }
            returnStatement += (hrs+" hrs");
            started = true;
        }
        if (mnts !== 0) {
            if (started) {
                returnStatement += ", ";
            }
            returnStatement += (mnts+" minutes");
            started = true;
        }
        /*
        if (secs != 0) {
            if (started) {
                returnStatement += ", and ";
            }
            returnStatement += (secs+" seconds");
        }*/
        return returnStatement
    }
}
