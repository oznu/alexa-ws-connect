/*
  AlexaWs.h - Library for controlling Arduino with Alexa via WS Connect
*/

#ifndef AlexaWs_h
#define AlexaWs_h

#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "Arduino.h"

typedef JsonObject AlexaRequest;
typedef JsonObject AlexaResponse;

class AlexaWs {
  public:
    WebSocketsClient webSocket;

    AlexaWs(void);

    #ifdef __AVR__
      typedef AlexaResponse& (*AlexaDiscoveryEvent)(AlexaRequest& request, AlexaResponse& response);
      typedef AlexaResponse& (*AlexaEvent)(AlexaRequest& request, AlexaResponse& response);
    #else
      typedef std::function<AlexaResponse& (AlexaRequest& request, AlexaResponse& response)> AlexaDiscoveryEvent;
      typedef std::function<AlexaResponse& (AlexaRequest& request, AlexaResponse& response)> AlexaEvent;
    #endif

    char* device_id;
    char* host;
    int port;
    boolean useSSL;

    void connect(char* clientId, char* clientToken, char* deviceId);
    void onDiscovery(AlexaDiscoveryEvent cbEvent);
    void onEvent(AlexaEvent cbEvent);
    void sendResponse(String requestId, AlexaResponse& res);

    void loop();
    void debug(boolean debug);
    
  private:
    AlexaDiscoveryEvent _cbDiscoveryEvent;
    AlexaEvent _cbEvent;
    boolean _debug;

    void incomingEventHandler(WStype_t type, uint8_t *payload, size_t length);
    void parseIncomingMessage(String payload);
    void routeMessage(JsonObject& req);

    void log(char* input);
    void log(String input);
    void log(char* input, char* arg);
    void log(char* input, int arg);

};

#endif
