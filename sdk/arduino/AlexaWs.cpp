/*
  AlexaWs.cpp - Library for controlling Arduino with Alexa via WS Connect
*/

#include <WebSocketsClient.h>
#include <ArduinoJson.h>

#include "Arduino.h"
#include "AlexaWs.h"

AlexaWs::AlexaWs() {
  _cbEvent = NULL;
  _cbDiscoveryEvent = NULL;
  _debug = false;

  host = "alexa.iot.oz.nu";
  port = 443;
  useSSL = true;
}

void AlexaWs::connect(char* clientId, char* clientToken, char* deviceId) {

  this->log("Starting connection...");
  this->log("Alexa Host: %s\n", host);
  this->log("Alexa Port: %d\n", port);
  this->log("Alexa Client ID: %s\n", clientId);
  this->log("Alexa Client Token: %s\n", clientToken);
  this->log("Alexa Device ID: %s\n", deviceId);

  device_id = deviceId;

  String webSocketUrl = "/?client_id=" + String(clientId) + \
    "&client_token=" + String(clientToken) + \
    "&device_id=" + String(deviceId); 

  webSocket.setReconnectInterval(5000);

  if (useSSL) {
    webSocket.beginSSL(host, port, webSocketUrl, "", "arduino");
  } else {
    webSocket.begin(host, port, webSocketUrl);
  }

  webSocket.setExtraHeaders("Host: alexa.iot.oz.nu");

  webSocket.onEvent(std::bind(&AlexaWs::incomingEventHandler, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3));
}

void AlexaWs::incomingEventHandler(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      this->log("Disconnected from Alexa WS Proxy!");
      break;
    case WStype_CONNECTED: {
      this->log("Connected to Alexa WS Proxy");
    }
    break;
    case WStype_TEXT: {
      this->parseIncomingMessage((char *)&payload[0]);
      break;
    }
  }
}

void AlexaWs::parseIncomingMessage(String payload) {
  this->log("Incoming Request");
  this->log(payload);

  DynamicJsonBuffer jsonBuffer;
  JsonObject& req = jsonBuffer.parseObject(payload);

  if (req.success()) {
    this->routeMessage(req);
  }
}

void AlexaWs::routeMessage(JsonObject& req) {
  String requestId = req["requestId"];
  String requestNamespace = req["directive"]["header"]["namespace"];
  String requestName = req["directive"]["header"]["name"];

  if (requestId) {
    DynamicJsonBuffer jsonBuffer;
    JsonObject& res = jsonBuffer.createObject();

    if (requestNamespace == "Alexa.Discovery") {
      this->sendResponse(requestId, _cbDiscoveryEvent(req, res));
    } else {
      this->sendResponse(requestId, _cbEvent(req, res));
    }
  }
}

void AlexaWs::sendResponse(String requestId, AlexaResponse& res) {
  this->log("Sending Response");

  DynamicJsonBuffer jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();

  root["requestId"] = requestId;
  root["response"] = res;

  String responsePayload;
  
  root.printTo(responsePayload);
  this->log(responsePayload);
  webSocket.sendTXT(responsePayload);
}

void AlexaWs::onDiscovery(AlexaDiscoveryEvent cbEvent) {
  this->log("Setting discovery callback");
  _cbDiscoveryEvent = cbEvent;
}

void AlexaWs::onEvent(AlexaEvent cbEvent) {
  this->log("Setting event callback");
  _cbEvent = cbEvent;
}

void AlexaWs::loop() {
  webSocket.loop();
}

void AlexaWs::debug(boolean debug) {
  _debug = debug;
}

void AlexaWs::log(char* input) {
  if (_debug) { Serial.println(input); };
}

void AlexaWs::log(String input) {
  if (_debug) { Serial.println(input); };
}

void AlexaWs::log(char* input, char* arg) {
  if (_debug) { Serial.printf(input, arg); };
}

void AlexaWs::log(char* input, int arg) {
  if (_debug) { Serial.printf(input, arg); };
}
