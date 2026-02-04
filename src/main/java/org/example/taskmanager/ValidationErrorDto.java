package org.example.taskmanager;

import java.time.LocalDateTime;
import java.util.List;

public record ValidationErrorDto(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        List<FieldErrorDto> errors
) {}
