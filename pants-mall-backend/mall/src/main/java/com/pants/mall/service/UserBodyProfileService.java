package com.pants.mall.service;

import com.pants.mall.entity.UserBodyProfile;

import java.util.List;

public interface UserBodyProfileService {

    void add(UserBodyProfile profile);

    void update(UserBodyProfile profile);

    void delete(Long id);

    List<UserBodyProfile> list();

    UserBodyProfile getByIdForAdmin(Long id);
}