#include <Arduino.h>
#include <Stream.h>

#include <ESP8266WiFi.h>

#include <AlexaWsThermostat.h>

AlexaWsThermostat thermostat;

// IOT config, change these:
char wifi_ssid[]          = "";
char wifi_password[]      = "";

char alexa_client_id[]    = ""; // Login to alexa.iot.oz.nu to get this
char alexa_client_token[] = ""; // Login to alexa.iot.oz.nu to get this
char alexa_device_id[]    = "test-thermostat"; // This should be unique among all your other devices

void setup() {
  Serial.begin(115200, SERIAL_8N1, SERIAL_TX_ONLY);
  
  WiFi.mode(WIFI_STA);
  
  WiFi.begin(wifi_ssid, wifi_password);
  
  Serial.println("");
  
  // Wait for connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to ");
  Serial.println(wifi_ssid);
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  thermostat.create("Thermostat");
  thermostat.alexa.debug(false);
  thermostat.alexa.connect(alexa_client_id, alexa_client_token, alexa_device_id);

  thermostat.onGetCurrentTemperature(getCurrentTemp);
  thermostat.onSetTargetTemperature(setTargetTemp);
  thermostat.onSetMode(setMode);
}

int getCurrentTemp() {
  // your code to get the current room temperature goes here
  Serial.println("Received request for current temperature");
  return 28;
}

void setTargetTemp(int targetTemperature) {
  // your code to set the target temp goes here
  Serial.printf("Setting temperature to %d\n", targetTemperature);
}

void setMode(char* mode) {
  // your code to set the thermostat mode goes here
   Serial.printf("Setting thermostat to %s\n", mode);
}

void loop() {
  thermostat.alexa.loop();
}
