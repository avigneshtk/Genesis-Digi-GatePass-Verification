import java.time.LocalDateTime;

public class GatePass
{
    private static int nextNumber = 1;

    private final String id;
    private final Student student;
    private final String destination;
    private final String reason;
    private final String outDateTime;
    private final String returnDateTime;
    private String status;
    private String decidedBy;
    private String decisionTime;

    public GatePass(Student student, String destination, String reason, String outDateTime, String returnDateTime)
    {
        this.id = String.format("GP-%03d", nextNumber++);
        this.student = student;
        this.destination = destination;
        this.reason = reason;
        this.outDateTime = outDateTime;
        this.returnDateTime = returnDateTime;
        this.status = "PENDING";
    }

    public Student getStudent()
    {
        return student;
    }

    public String getId()
    {
        return id;
    }

    public String getStatus()
    {
        return status;
    }

    public void approve(Warden warden)
    {
        status = "APPROVED";
        decidedBy = warden.getName();
        decisionTime = LocalDateTime.now().toString();
    }

    public void reject(Warden warden)
    {
        status = "REJECTED";
        decidedBy = warden.getName();
        decisionTime = LocalDateTime.now().toString();
    }

    @Override
    public String toString()
    {
        String decision;

        if (decidedBy == null)
        {
            decision = "PENDING";
        }
        else
        {
            decision = status + " by " + decidedBy + " at " + decisionTime;
        }

        return "\nGatepass: " + id
                + "\nStudent: " + student.getName() + " (" + student.getStudentId() + ")"
                + "\nDestination: " + destination
                + "\nReason: " + reason
                + "\nOut: " + outDateTime
                + "\nExpected return: " + returnDateTime
                + "\nStatus: " + decision + "\n";
    }
}
