# Ardunio ESP SDK for WS Connect

## Supported Devices

* ESP8266
* ESP32

## Dependencies

* [arduinoWebSockets](https://github.com/Links2004/arduinoWebSockets)
* [ArduinoJson](https://github.com/bblanchon/ArduinoJson)

## Installation

Copy the SDK into your Arduino IDE library directory.

## Usage

```c++
#include <Arduino.h>
#include <Stream.h>
#include <ESP8266WiFi.h>

#include "AlexaWs.h"

// device config, change these:
char wifi_ssid[]          = "";
char wifi_password[]      = "";

char alexa_client_id[]    = ""; // Login to alexa.iot.oz.nu to get this
char alexa_client_token[] = ""; // Login to alexa.iot.oz.nu to get this
char alexa_device_id[]    = "test-thermostat"; // This should be unique among all your other devices

AlexaWs alexa;

void setup() {
  Serial.begin(115200, SERIAL_8N1, SERIAL_TX_ONLY);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifi_ssid, wifi_password);

  Serial.println("");
  
  // wait for connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.print("Connected to ");
  Serial.println(wifi_ssid);
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // print debug information to serial port
  alexa.debug(true);

  // connect to ws connect
  alexa.connect(alexa_client_id, alexa_client_token, alexa_device_id);

  // set discovery handler function
  alexa.onDiscovery(discoveryHandler);

  // set alexa event handler function
  alexa.onEvent(eventHandler);
}

AlexaResponse& discoveryHandler(AlexaRequest& request, AlexaResponse& response) {
  // discovery events will be sent here, build discovery json response and return
  return response;
}

AlexaResponse& eventHandler(AlexaRequest& request, AlexaResponse& response) {
  // alexa event requests will be sent here, build json response and return
  return response;
}

void loop() {
  alexa.loop();
}
```