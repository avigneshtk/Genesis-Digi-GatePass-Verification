import java.time.LocalDateTime;
import java.util.UUID;

public class GatePass
{
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
        this.id = "GP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        this.student = student;
        this.destination = destination;
        this.reason = reason;
        this.outDateTime = outDateTime;
        this.returnDateTime = returnDateTime;
        this.status = "PENDING";
    }

    public GatePass(String id, Student student, String destination, String reason, String outDateTime,
                    String returnDateTime, String status, String decidedBy, String decisionTime)
    {
        this.id = id;
        this.student = student;
        this.destination = destination;
        this.reason = reason;
        this.outDateTime = outDateTime;
        this.returnDateTime = returnDateTime;
        this.status = status;
        this.decidedBy = decidedBy;
        this.decisionTime = decisionTime;
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

    public String getDestination()
    {
        return destination;
    }

    public String getReason()
    {
        return reason;
    }

    public String getOutDateTime()
    {
        return outDateTime;
    }

    public String getReturnDateTime()
    {
        return returnDateTime;
    }

    public String getDecidedBy()
    {
        return decidedBy;
    }

    public String getDecisionTime()
    {
        return decisionTime;
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
