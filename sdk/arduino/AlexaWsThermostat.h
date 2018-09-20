/*
  AlexaWsThermostat.h - Library for controlling an Arduino Thermostat with Alexa via WS Connect
*/

#ifndef AlexaWsThermostat_h
#define AlexaWsThermostat_h

#include "AlexaWs.h"

class AlexaWsThermostat {
  public:    
    AlexaWsThermostat(void);

    AlexaWs alexa;

    char* deviceName;
    char* manufacturerName;
    char* description;

    int currentTemperature;
    int targetTemperature;
    char* currentMode;

    void create(char* _deviceName);

    #ifdef __AVR__
      typedef int (*AlexaWsThermostatGetCurrentTemperature)();
      typedef void (*AlexaWsThermostatSetTargetTemperature)(int targetTemperature);
      typedef int (*AlexaWsThermostatGetTargetTemperature)();
      typedef void (*AlexaWsThermostatSetMode)(char* mode);
      typedef char* (*AlexaWsThermostatGetMode)();
    #else
      typedef std::function<int ()> AlexaWsThermostatGetCurrentTemperature;
      typedef std::function<void (int targetTemperature)> AlexaWsThermostatSetTargetTemperature;
      typedef std::function<int ()> AlexaWsThermostatGetTargetTemperature;
      typedef std::function<void (char* mode)> AlexaWsThermostatSetMode;
      typedef std::function<char* ()> AlexaWsThermostatGetMode;
    #endif

    void onGetCurrentTemperature(AlexaWsThermostatGetCurrentTemperature _cb);
    void onSetTargetTemperature(AlexaWsThermostatSetTargetTemperature _cb);
    void onGetTargetTemperature(AlexaWsThermostatGetTargetTemperature _cb);
    void onSetMode(AlexaWsThermostatSetMode _cb);
    void onGetMode(AlexaWsThermostatGetMode _cb);

  private:
    AlexaResponse& handleDiscoveryEvent(AlexaRequest& request, AlexaResponse& response);
    AlexaResponse& handleChangeEvent(AlexaRequest& request, AlexaResponse& response);
    AlexaResponse& discoveryResponse(AlexaResponse& response);
    AlexaResponse& reportStateResponse(char* namespaceHeader, char* nameHeader, AlexaRequest& request, AlexaResponse& response);

    void setTargetTemperature(AlexaRequest& request);
    void setMode(AlexaRequest& request);

    AlexaWsThermostatGetCurrentTemperature _cbGetCurrentTemperature;
    AlexaWsThermostatSetTargetTemperature _cbSetTargetTemperature;
    AlexaWsThermostatGetTargetTemperature _cbGetTargetTemperature;
    AlexaWsThermostatSetMode _cbSetMode;
    AlexaWsThermostatGetMode _cbGetMode;
};

#endif
