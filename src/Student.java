public class Student
{
    private final String studentId;
    private final String name;
    private final String roomNumber;
    private final String password;

    public Student(String studentId, String name, String roomNumber, String password)
    {
        this.studentId = studentId;
        this.name = name;
        this.roomNumber = roomNumber;
        this.password = password;
    }

    public String getStudentId()
    {
        return studentId;
    }

    public String getName()
    {
        return name;
    }

    public String getRoomNumber()
    {
        return roomNumber;
    }

    public boolean checkPassword(String enteredPassword)
    {
        return password.equals(enteredPassword);
    }
}
