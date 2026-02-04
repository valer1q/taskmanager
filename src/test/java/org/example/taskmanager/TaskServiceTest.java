package org.example.taskmanager;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class TaskServiceTest {

    private final TaskService service = new TaskService();

    @Test
    void shouldCreateTask() {
        TaskRequest request = new TaskRequest("Title", "Desc", TaskStatus.TODO, LocalDateTime.now().plusDays(1));
        Task created = service.create(request);

        assertNotNull(created.id());
        assertNotNull(created.createdAt());
        assertEquals("Title", created.title());
        assertEquals(TaskStatus.TODO, created.status());
    }

    @Test
    void shouldUpdateTask() {
        Task created = service.create(new TaskRequest("Old", null, TaskStatus.TODO, null));
        UUID id = created.id();

        Task updated = service.update(id, new TaskRequest("New", "D", TaskStatus.DONE, LocalDateTime.now().plusDays(2)));

        assertEquals(id, updated.id());
        assertEquals("New", updated.title());
        assertEquals(TaskStatus.DONE, updated.status());
        assertEquals(created.createdAt(), updated.createdAt()); // createdAt сохраняем
    }

    @Test
    void shouldThrowWhenDeleteMissingTask() {
        assertThrows(TaskNotFoundException.class, () -> service.delete(UUID.randomUUID()));
    }
}