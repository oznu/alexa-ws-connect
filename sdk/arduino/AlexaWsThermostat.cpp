/*
  AlexaWsThermostat.cpp - Library for controlling an Arduino Thermostat with Alexa via WS Connect
*/

#include "Arduino.h"
#include "AlexaWs.h"
#include "AlexaWsThermostat.h"
#include <ArduinoJson.h>

AlexaWsThermostat::AlexaWsThermostat() {
  _cbGetCurrentTemperature = NULL;
  _cbSetTargetTemperature = NULL;
  _cbGetTargetTemperature = NULL;
  _cbSetMode = NULL;
  _cbGetMode = NULL;

  // set default values
  currentMode = "OFF";
  currentTemperature = 0;
  targetTemperature = 0;
  
  manufacturerName = "AlexaWs Thermostat";
  description =  "AlexaWs Thermostat Controller";
}

void AlexaWsThermostat::create(char* _deviceName) {
  deviceName = _deviceName;
  alexa.onDiscovery(std::bind(&AlexaWsThermostat::handleDiscoveryEvent, this, std::placeholders::_1, std::placeholders::_2));
  alexa.onEvent(std::bind(&AlexaWsThermostat::handleChangeEvent, this, std::placeholders::_1, std::placeholders::_2));
}

AlexaResponse& AlexaWsThermostat::handleDiscoveryEvent(AlexaRequest& request, AlexaResponse& response) {
  return this->discoveryResponse(response);
}

AlexaResponse& AlexaWsThermostat::handleChangeEvent(AlexaRequest& request, AlexaResponse& response) {
  if (request["directive"]["header"]["name"] == "ReportState") {
    return this->reportStateResponse("Alexa", "StateReport", request, response);

  } else if (request["directive"]["header"]["name"] == "SetTargetTemperature") {
    this->setTargetTemperature(request);
    return this->reportStateResponse("Alexa", "Response", request, response);

  } else if (request["directive"]["header"]["name"] == "SetThermostatMode") {
    this->setMode(request);
    return this->reportStateResponse("Alexa", "Response", request, response);

  } else {

    response["error"] = "Unhandled Event";
    return response;

  }
}

void AlexaWsThermostat::setTargetTemperature(AlexaRequest& request) {
  targetTemperature = request["directive"]["payload"]["targetSetpoint"]["value"];

  if (_cbSetTargetTemperature) {
    this->_cbSetTargetTemperature(targetTemperature);
  }
}

void AlexaWsThermostat::setMode(AlexaRequest& request) {
  // for some reason this is being picky about the types
  // the result from the request should already be char* but it is failing
  // workaround is to convert to string then back to char* for now
  String _currentMode = request["directive"]["payload"]["thermostatMode"]["value"];
  char * _currentModeChar = new char[_currentMode.length() + 1];
  currentMode = strcpy(_currentModeChar,_currentMode.c_str());

  if (_cbSetMode) {
    this->_cbSetMode(currentMode);
  }
}

AlexaResponse& AlexaWsThermostat::reportStateResponse(char* namespaceHeader, char* nameHeader, AlexaRequest& request, AlexaResponse& response) {
  JsonObject& context = response.createNestedObject("context");

  JsonArray& contextProperties = context.createNestedArray("properties");

  JsonObject& contextPropertiesTempSensor = contextProperties.createNestedObject();
  contextPropertiesTempSensor["namespace"] = "Alexa.TemperatureSensor";
  contextPropertiesTempSensor["name"] = "temperature";
  contextPropertiesTempSensor["uncertaintyInMilliseconds"] = 1000;
  contextPropertiesTempSensor["timeOfSample"] = request["requestTime"];

  JsonObject& contextPropertiesTempSensorValue = contextPropertiesTempSensor.createNestedObject("value");
  contextPropertiesTempSensorValue["value"] = this->_cbGetCurrentTemperature();
  contextPropertiesTempSensorValue["scale"] = "CELSIUS";

  JsonObject& contextPropertiesThermostatTargetSetpoint = contextProperties.createNestedObject();
  contextPropertiesThermostatTargetSetpoint["namespace"] = "Alexa.ThermostatController";
  contextPropertiesThermostatTargetSetpoint["name"] = "targetSetpoint";
  contextPropertiesThermostatTargetSetpoint["uncertaintyInMilliseconds"] = 1000;
  contextPropertiesThermostatTargetSetpoint["timeOfSample"] = request["requestTime"];

  JsonObject& contextPropertiesThermostatTargetSetpointValue = contextPropertiesThermostatTargetSetpoint.createNestedObject("value");
  contextPropertiesThermostatTargetSetpointValue["value"] = targetTemperature;
  contextPropertiesThermostatTargetSetpointValue["scale"] = "CELSIUS";

  JsonObject& contextPropertiesThermostatMode = contextProperties.createNestedObject();
  contextPropertiesThermostatMode["namespace"] = "Alexa.ThermostatController";
  contextPropertiesThermostatMode["name"] = "thermostatMode";
  contextPropertiesThermostatMode["uncertaintyInMilliseconds"] = 1000;
  contextPropertiesThermostatMode["timeOfSample"] = request["requestTime"];
  contextPropertiesThermostatMode["value"] = currentMode;

  JsonObject& event = response.createNestedObject("event");

  JsonObject& eventHeader = event.createNestedObject("header");
  eventHeader["namespace"] = namespaceHeader;
  eventHeader["name"] = nameHeader;
  eventHeader["payloadVersion"] = "3";

  // create return messsage id from incoming message id and set header
  String messageId = request["directive"]["header"]["messageId"];
  messageId = messageId + "-r";
  eventHeader["messageId"] = messageId;

  // check for a correlationToken
  const char* correlationToken = request["directive"]["header"]["correlationToken"];
  if (correlationToken) {
    eventHeader["correlationToken"] = request["directive"]["header"]["correlationToken"];
  }

  JsonObject& eventEndpoint = event.createNestedObject("endpoint");
  eventEndpoint["endpointId"] = this->alexa.device_id;

  // create event payload (empty)
  event.createNestedObject("payload");
  
  return response;
}

AlexaResponse& AlexaWsThermostat::discoveryResponse(AlexaResponse& response) {
  response["endpointId"] = this->alexa.device_id;
  response["friendlyName"] = deviceName;
  response["manufacturerName"] = manufacturerName;
  response["description"] = description;

  JsonArray& displayCategories = response.createNestedArray("displayCategories");
  displayCategories.add("THERMOSTAT");

  JsonArray& capabilities = response.createNestedArray("capabilities");

  JsonObject& thermostatCapability = capabilities.createNestedObject();
  thermostatCapability["type"] = "AlexaInterface";
  thermostatCapability["interface"] = "Alexa.ThermostatController";
  thermostatCapability["version"] = "3";

  JsonObject& thermostatProperties = thermostatCapability.createNestedObject("properties");
  JsonArray& thermostatPropertiesSupported = thermostatProperties.createNestedArray("supported");

  JsonObject& thermostatPropertiesSupportedTargetSetPoint = thermostatPropertiesSupported.createNestedObject();
  thermostatPropertiesSupportedTargetSetPoint["name"] = "targetSetpoint";

  JsonObject& thermostatPropertiesSupportedThermostatMode = thermostatPropertiesSupported.createNestedObject();
  thermostatPropertiesSupportedThermostatMode["name"] = "thermostatMode";

  thermostatProperties["proactivelyReported"] = true;
  thermostatProperties["retrievable"] = true;

  JsonObject& thermostatConfiguration = thermostatCapability.createNestedObject("configuration");
  thermostatConfiguration["supportsScheduling"] = false;

  JsonArray& thermostatConfigurationSupportedModes = thermostatConfiguration.createNestedArray("supportedModes");
  thermostatConfigurationSupportedModes.add("HEAT");
  thermostatConfigurationSupportedModes.add("COOL");
  thermostatConfigurationSupportedModes.add("AUTO");
  thermostatConfigurationSupportedModes.add("OFF");

  JsonObject& tempSensorCapability = capabilities.createNestedObject();
  tempSensorCapability["type"] = "AlexaInterface";
  tempSensorCapability["interface"] = "Alexa.TemperatureSensor";
  tempSensorCapability["version"] = "3";

  return response;
}

void AlexaWsThermostat::onGetCurrentTemperature(AlexaWsThermostatGetCurrentTemperature _cb) {
  _cbGetCurrentTemperature = _cb;
}

void AlexaWsThermostat::onSetTargetTemperature(AlexaWsThermostatSetTargetTemperature _cb) {
  _cbSetTargetTemperature = _cb;
}

void AlexaWsThermostat::onGetTargetTemperature(AlexaWsThermostatGetTargetTemperature _cb) {
  _cbGetTargetTemperature = _cb;
}

void AlexaWsThermostat::onSetMode(AlexaWsThermostatSetMode _cb) {
  _cbSetMode = _cb;
}

void AlexaWsThermostat::onGetMode(AlexaWsThermostatGetMode _cb) {
  _cbGetMode = _cb;
}