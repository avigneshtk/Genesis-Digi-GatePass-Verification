import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class Database
{
    private static final String DATABASE_URL = "jdbc:sqlite:data/gatepass.db";

    public void initialize()
    {
        try
        {
            Files.createDirectories(Path.of("data"));

            try (Connection connection = connect(); Statement statement = connection.createStatement())
            {
                statement.executeUpdate("CREATE TABLE IF NOT EXISTS students (student_id TEXT PRIMARY KEY, name TEXT NOT NULL, room_number TEXT NOT NULL, password TEXT NOT NULL)");
                statement.executeUpdate("CREATE TABLE IF NOT EXISTS wardens (warden_id TEXT PRIMARY KEY, name TEXT NOT NULL, hostel_name TEXT NOT NULL, password TEXT NOT NULL)");
                statement.executeUpdate("CREATE TABLE IF NOT EXISTS gatepasses (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, destination TEXT NOT NULL, reason TEXT NOT NULL, out_date_time TEXT NOT NULL, return_date_time TEXT NOT NULL, status TEXT NOT NULL, decided_by TEXT, decision_time TEXT)");
                statement.executeUpdate("INSERT OR IGNORE INTO students VALUES ('STU001', 'Aarav Sharma', 'B-204', 'student123')");
                statement.executeUpdate("INSERT OR IGNORE INTO wardens VALUES ('WARDEN01', 'Dr Meera Iyer', 'Boys Hostel', 'warden123')");
            }
        }
        catch (IOException | SQLException exception)
        {
            throw new IllegalStateException("Could not initialize the database.", exception);
        }
    }

    public Student authenticateStudent(String studentId, String password)
    {
        String query = "SELECT student_id, name, room_number FROM students WHERE student_id = ? AND password = ?";

        try (Connection connection = connect(); PreparedStatement statement = connection.prepareStatement(query))
        {
            statement.setString(1, studentId);
            statement.setString(2, password);
            ResultSet result = statement.executeQuery();

            if (result.next())
            {
                return new Student(result.getString("student_id"), result.getString("name"), result.getString("room_number"), password);
            }

            return null;
        }
        catch (SQLException exception)
        {
            throw new IllegalStateException("Could not read student login details.", exception);
        }
    }

    public Warden authenticateWarden(String wardenId, String password)
    {
        String query = "SELECT warden_id, name, hostel_name FROM wardens WHERE warden_id = ? AND password = ?";

        try (Connection connection = connect(); PreparedStatement statement = connection.prepareStatement(query))
        {
            statement.setString(1, wardenId);
            statement.setString(2, password);
            ResultSet result = statement.executeQuery();

            if (result.next())
            {
                return new Warden(result.getString("warden_id"), result.getString("name"), result.getString("hostel_name"), password);
            }

            return null;
        }
        catch (SQLException exception)
        {
            throw new IllegalStateException("Could not read warden login details.", exception);
        }
    }

    public void saveGatePass(GatePass gatePass)
    {
        String query = "INSERT INTO gatepasses (id, student_id, destination, reason, out_date_time, return_date_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (Connection connection = connect(); PreparedStatement statement = connection.prepareStatement(query))
        {
            statement.setString(1, gatePass.getId());
            statement.setString(2, gatePass.getStudent().getStudentId());
            statement.setString(3, gatePass.getDestination());
            statement.setString(4, gatePass.getReason());
            statement.setString(5, gatePass.getOutDateTime());
            statement.setString(6, gatePass.getReturnDateTime());
            statement.setString(7, gatePass.getStatus());
            statement.executeUpdate();
        }
        catch (SQLException exception)
        {
            throw new IllegalStateException("Could not save the gatepass.", exception);
        }
    }

    public List<GatePass> loadGatePasses()
    {
        List<GatePass> gatePasses = new ArrayList<>();
        String query = "SELECT g.*, s.name, s.room_number FROM gatepasses g JOIN students s ON s.student_id = g.student_id ORDER BY g.rowid DESC";

        try (Connection connection = connect(); PreparedStatement statement = connection.prepareStatement(query); ResultSet result = statement.executeQuery())
        {
            while (result.next())
            {
                Student student = new Student(result.getString("student_id"), result.getString("name"), result.getString("room_number"), "");
                gatePasses.add(new GatePass(result.getString("id"), student, result.getString("destination"), result.getString("reason"),
                        result.getString("out_date_time"), result.getString("return_date_time"), result.getString("status"),
                        result.getString("decided_by"), result.getString("decision_time")));
            }

            return gatePasses;
        }
        catch (SQLException exception)
        {
            throw new IllegalStateException("Could not load gatepasses.", exception);
        }
    }

    public void updateDecision(GatePass gatePass)
    {
        String query = "UPDATE gatepasses SET status = ?, decided_by = ?, decision_time = ? WHERE id = ?";

        try (Connection connection = connect(); PreparedStatement statement = connection.prepareStatement(query))
        {
            statement.setString(1, gatePass.getStatus());
            statement.setString(2, gatePass.getDecidedBy());
            statement.setString(3, gatePass.getDecisionTime());
            statement.setString(4, gatePass.getId());
            statement.executeUpdate();
        }
        catch (SQLException exception)
        {
            throw new IllegalStateException("Could not update the gatepass decision.", exception);
        }
    }

    private Connection connect() throws SQLException
    {
        return DriverManager.getConnection(DATABASE_URL);
    }
}
