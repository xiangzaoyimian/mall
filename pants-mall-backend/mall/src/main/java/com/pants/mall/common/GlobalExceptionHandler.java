package com.pants.mall.common;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusiness(BusinessException ex) {
        return Result.fail(ex.getCode(), ex.getMessage());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class, ConstraintViolationException.class})
    public Result<Void> handleValidation(Exception ex) {
        return Result.fail(HttpStatus.BAD_REQUEST.value(), "参数校验失败");
    }

    @ExceptionHandler(BadCredentialsException.class)
    public Result<Void> handleBadCredentials(BadCredentialsException ex) {
        return Result.fail(HttpStatus.UNAUTHORIZED.value(), "用户名或密码错误");
    }

    @ExceptionHandler(Exception.class)
public Result<Void> handleOther(Exception ex) {
    ex.printStackTrace(); // ✅ 打印真实异常堆栈到终端
    return Result.fail(500, "服务器内部错误");
}
}
