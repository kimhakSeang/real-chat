package com.kimhak.niche.app.dto;

public class User {
    private Integer id;
    private String name;
    private Contact contact;

    public User() {
    }

    public User(Integer id, String name, Contact contact) {
        this.id = id;
        this.name = name;
        this.contact = contact;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Contact getContact() {
        return contact;
    }

}
