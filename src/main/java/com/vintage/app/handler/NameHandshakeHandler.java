package com.vintage.app.handler;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.security.Principal;
import java.util.Map;
import java.util.regex.Pattern;

public class NameHandshakeHandler extends DefaultHandshakeHandler {
    private static final Pattern VALID = Pattern.compile("[A-Za-z0-9_-]{1,20}");
    @Override
    protected Principal determineUser(ServerHttpRequest req, WebSocketHandler h, Map<String, Object> attrs) {
        String name = UriComponentsBuilder.fromUri(req.getURI()).build().getQueryParams().getFirst("name");
        if (name != null && VALID.matcher(name).matches()) return () -> name;
        return super.determineUser(req, h, attrs);   // no name = anonymous (e.g. admin page)
    }
}