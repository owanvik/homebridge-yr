"use strict";

var Service, Characteristic;
var temperatureService;
var WindSpeedService;
var request = require("request");

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-yr", "Yr", WeatherAccessory);
}

function WeatherAccessory(log, config) {
    this.log = log;
    this.nameTemp = config["nameTemp"];
    this.nameWS = config["nameWS"]
    this.location = config["location"];
    this.lastupdate = 0;
    this.temperature = 0;
}

WeatherAccessory.prototype =
    {
        getState: function (callback) {
            // Only fetch new data once per hour
            if (this.lastupdate + (60 * 60) < (Date.now() / 1000 | 0)) {
                var url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?'+this.location;
                this.httpRequest(url, function (error, response, responseBody) {
                    if (error) {
                        this.log("HTTP get weather function failed: %s", error.message);
                        callback(error);
                    } else {
                        var weatherObj = JSON.parse(responseBody);
                        var temperature = parseFloat(weatherObj.properties.timeseries[2].data.instant.details.air_temperature);
                        this.log("temperature: ", temperature);
                        this.temperature = temperature;

                        var WindSpeed = parseFloat(weatherObj.properties.timeseries[2].data.instant.details.wind_speed);
                        this.log("WindSpeed: ", WindSpeed);
                        this.WindSpeed = WindSpeed;

                        this.lastupdate = (Date.now() / 1000);
                        callback(null, this.temperature, this.WindSpeed);
                    }
                }.bind(this));
            } else {
                this.log("Returning cached data", this.temperature);
                temperatureService.setCharacteristic(Characteristic.CurrentTemperature, this.temperature);
                callback(null, this.temperature);

                this.log("Returning cached data", this.WindSpeed);
                WindSpeedService.setCharacteristic(Characteristic.CurrentWindSpeed, this.WindSpeed);
                callback(null, this.WindSpeed);

            }
        },

        identify: function (callback) {
            this.log("Identify requested!");
            callback(); // success
        },

        getServices: function () {
            var informationService = new Service.AccessoryInformation();

            informationService
                .setCharacteristic(Characteristic.Manufacturer, "Olai Wanvik")
                .setCharacteristic(Characteristic.Model, "Location")
                .setCharacteristic(Characteristic.SerialNumber, "");

            temperatureService = new Service.TemperatureSensor(this.nameTemp);
            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .on("get", this.getState.bind(this));

            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({minValue: -30});

            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({ maxValue: 120 });

            WindSpeedService = new Service.WindSpeedSensor(this.nameWS);
            WindSpeedService
                .getCharacteristic(Characteristic.CurrentWindSpeed)
                .on("get", this.getState.bind(this));

            WindSpeedService
                .getCharacteristic(Characteristic.CurrentWindSpeed)
                .setProps({ minValue: -30 });

            WindSpeedService
                .getCharacteristic(Characteristic.CurrentWindSpeed)
                .setProps({ maxValue: 120 });


            return [informationService, temperatureService, WindSpeedService];



        },

        httpRequest: function (url, callback) {
            request({
                    url: url,
                    body: "",
                    headers: {
                        'User-Agent': 'PostmanRuntime/7.26.10'
                    },
                    method: "GET",
                    rejectUnauthorized: false
                },
                function (error, response, body) {
                    callback(error, response, body)
                })
        }

    };

    

if (!Date.now) {
    Date.now = function () {
        return new Date().getTime();
    }
}
