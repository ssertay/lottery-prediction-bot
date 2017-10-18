var fs = require('fs');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Twitter = require('twitter');

var client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var SayisalTahminSchema = new Schema({
    tarih: Date,
    rakamlar: [Number]
});

var OnNumarTahminSchema = new Schema({
    tarih: Date,
    rakamlar: [Number]
});

var SuperLotoTahminSchema = new Schema({
    tarih: Date,
    rakamlar: [Number]
});

var SansTopuTahminSchema = new Schema({
    tarih: Date,
    rakamlar: [Number],
    arti: Number
});

mongoose.connect('mongodb://localhost/lotoDatabase');

var sayisalTahmin = mongoose.model('sayisalTahmin', SayisalTahminSchema)
  , onNumaraTahmin = mongoose.model('onNumaraTahmin', OnNumarTahminSchema)
  , superLotoTahmin = mongoose.model('superLotoTahmin', SuperLotoTahminSchema)
  , sansTopuTahmin = mongoose.model('sansTopuTahmin', SansTopuTahminSchema);

var date = new Date();
  , dayIndex = date.getDay()
  , weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  , size = [0, 10, 0, 5, 6, 0, 6]
  , max = [0, 80, 0, 34, 54, 0, 49]
  , oyunIsimleri = ["", "On Numara", "", "Sans Topu", "Super Loto", "", "Sayisal Loto"];


var today = weekdays[dayIndex];

var base_URL = "http://www.mpi.gov.tr/sonuclar/cekilisler";
var oyunlar = ["", "/onnumara/", "", "/sanstopu/", "/superloto/", "", "/sayisal/"];

Date.prototype.yyyymmdd = function () {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth() + 1).toString();
    var dd = this.getDate().toString();
    return yyyy + (mm[1] ? mm : "0" + mm[0]) + (dd[1] ? dd : "0" + dd[0]);
};

function sortNumber(a, b) {
    return a - b;
}

function yeniKupon(size, max, gun) {
    var kupon = [];

    while (kupon.length < size) {
        var yeni = Math.floor((Math.random() * max) + 1);
        if (kupon.indexOf(yeni) < 0) {
            kupon.push(yeni);
        }
    }
    kupon.sort(sortNumber);

    /**Carsambaysa sans topu kuponu yap arti bir ekle.  */
    if (gun === "Wednesday") {
        kupon.push(Math.floor((Math.random() * 14) + 1));
    }

    return kupon;
}

function kuponBas(kupon) {
    var tweet = "Gunun "
        + oyunIsimleri[dayIndex]
        + " kuponu: \n";
    if (today != "Wednesday") {
        kupon.forEach(function (number) {
            tweet += " " + number;
        });
    }
    else {
        for (var i = 0; i < 5; i++) {
            tweet += " " + kupon[i];
        }
        tweet += " + " + kupon[5];
    }

    return tweet;
}

function newTahmin(yeni_kupon) {
    var yeni_tahmin;

    switch (today) {
        case "Monday":
            yeni_tahmin = new onNumaraTahmin({
                tarih: date
            });
            for (var j = 0; j < yeni_kupon.length; j++) {
                yeni_tahmin.rakamlar.push(parseInt(yeni_kupon[j]));
            }
            break;
        case "Wednesday":
            yeni_tahmin = new sansTopuTahmin({
                tarih: date
            });
            for (var j = 0; j < 5; j++) {
                yeni_tahmin.rakamlar.push(parseInt(yeni_kupon[j]));
            }
            yeni_tahmin.arti = parseInt(yeni_kupon[5]);
            break;
        case "Thursday":
            yeni_tahmin = new superLotoTahmin({
                tarih: date
            });
            for (var j = 0; j < yeni_kupon.length; j++) {
                yeni_tahmin.rakamlar.push(parseInt(yeni_kupon[j]));
            }
            break;
        case "Saturday":
            yeni_tahmin = new sayisalTahmin({
                tarih: date
            });
            for (var j = 0; j < yeni_kupon.length; j++) {
                yeni_tahmin.rakamlar.push(parseInt(yeni_kupon[j]));
            }
            break;
        default:
            break;
    }

    return yeni_tahmin;
}

if (today === "Monday" || today === "Wednesday" || today === "Thursday" || today === "Saturday") {

    var yeni_kupon = yeniKupon(size[dayIndex], max[dayIndex], today);
    var tweet_body = kuponBas(yeni_kupon);
    console.log(date + "\n" + tweet_body + "\n");

    /* Post the tweet body. */
    client.post('statuses/update', { status: tweet_body }, function (error, tweet, response) {
        if (error) { throw error; }
        fs.writeFile('/home/sertay/loto_bot/url',
            base_URL.concat(oyunlar[dayIndex]).concat(date.yyyymmdd()).concat(".json"));
    });


    /** Tahmin veritabanina burada ekle. */
    var yeni_tahmin = newTahmin(yeni_kupon);
    yeni_tahmin.save(function (err, eklenen_tahmin) {
        if(err){
            console.log(err);
            throw err;
        }
        else{
            console.log("DB'ye eklenen tahmin: \n");
            console.log(eklenen_tahmin);
            mongoose.disconnect();
        }
    });

}
else {
    console.log(date + "\n" + "Not today, motherfuckers.\n");
}
