import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class HostelGatePassSystem
{
    private static final Scanner scanner = new Scanner(System.in);
    private static final List<Student> students = new ArrayList<>();
    private static final List<Warden> wardens = new ArrayList<>();
    private static final List<GatePass> gatePasses = new ArrayList<>();

    public static void main(String[] args)
    {
        createDemoUsers();
        showWelcomeMessage();

        boolean running = true;

        while (running)
        {
            System.out.println("\n1. Student Login");
            System.out.println("2. Warden Login");
            System.out.println("3. Exit");
            System.out.print("Choose an option: ");

            String choice = scanner.nextLine();

            switch (choice)
            {
                case "1":
                    studentLogin();
                    break;
                case "2":
                    wardenLogin();
                    break;
                case "3":
                    running = false;
                    System.out.println("Goodbye.");
                    break;
                default:
                    System.out.println("Please enter 1, 2, or 3.");
            }
        }
    }

    private static void createDemoUsers()
    {
        students.add(new Student("STU001", "Aarav Sharma", "B-204", "student123"));
        wardens.add(new Warden("WARDEN01", "Dr Meera Iyer", "Boys Hostel", "warden123"));
    }

    private static void showWelcomeMessage()
    {
        System.out.println("============================================");
        System.out.println("   HOSTEL GATEPASS VERIFICATION SYSTEM");
        System.out.println("============================================");
        System.out.println("Student login: STU001 / student123");
        System.out.println("Warden login : WARDEN01 / warden123");
    }

    private static void studentLogin()
    {
        System.out.print("Student ID: ");
        String studentId = scanner.nextLine();
        System.out.print("Password: ");
        String password = scanner.nextLine();
        Student student = findStudent(studentId);

        if (student == null || !student.checkPassword(password))
        {
            System.out.println("Invalid student ID or password.");
            return;
        }

        studentMenu(student);
    }

    private static void studentMenu(Student student)
    {
        boolean loggedIn = true;

        while (loggedIn)
        {
            System.out.println("\nStudent: " + student.getName() + " | Room: " + student.getRoomNumber());
            System.out.println("1. Apply for gatepass");
            System.out.println("2. View my gatepasses");
            System.out.println("3. Logout");
            System.out.print("Choose an option: ");

            switch (scanner.nextLine())
            {
                case "1":
                    createGatePass(student);
                    break;
                case "2":
                    showStudentGatePasses(student);
                    break;
                case "3":
                    loggedIn = false;
                    break;
                default:
                    System.out.println("Please enter 1, 2, or 3.");
            }
        }
    }

    private static void createGatePass(Student student)
    {
        DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        LocalDateTime defaultLeaveTime = LocalDateTime.now().plusHours(6);
        LocalDateTime defaultReturnTime = defaultLeaveTime.plusDays(2);

        System.out.print("Destination: ");
        String destination = scanner.nextLine();
        System.out.print("Reason for leave: ");
        String reason = scanner.nextLine();
        System.out.print("Leave date and time [" + defaultLeaveTime.format(dateFormat) + "]: ");
        String outDateTime = scanner.nextLine();
        System.out.print("Expected return date and time [" + defaultReturnTime.format(dateFormat) + "]: ");
        String returnDateTime = scanner.nextLine();

        if (outDateTime.isBlank())
        {
            outDateTime = defaultLeaveTime.format(dateFormat);
        }

        if (returnDateTime.isBlank())
        {
            returnDateTime = defaultReturnTime.format(dateFormat);
        }

        if (destination.isBlank() || reason.isBlank())
        {
            System.out.println("Destination and reason are required.");
            return;
        }

        GatePass gatePass = new GatePass(student, destination, reason, outDateTime, returnDateTime);
        gatePasses.add(gatePass);
        System.out.println("Gatepass " + gatePass.getId() + " submitted for warden approval.");
    }

    private static void showStudentGatePasses(Student student)
    {
        boolean found = false;

        for (GatePass gatePass : gatePasses)
        {
            if (gatePass.getStudent().getStudentId().equals(student.getStudentId()))
            {
                System.out.println(gatePass);
                found = true;
            }
        }

        if (!found)
        {
            System.out.println("You have not applied for a gatepass yet.");
        }
    }

    private static void wardenLogin()
    {
        System.out.print("Warden ID: ");
        String wardenId = scanner.nextLine();
        System.out.print("Password: ");
        String password = scanner.nextLine();
        Warden warden = findWarden(wardenId);

        if (warden == null || !warden.checkPassword(password))
        {
            System.out.println("Invalid warden ID or password.");
            return;
        }

        wardenMenu(warden);
    }

    private static void wardenMenu(Warden warden)
    {
        boolean loggedIn = true;

        while (loggedIn)
        {
            System.out.println("\nWarden: " + warden.getName() + " | " + warden.getHostelName());
            System.out.println("1. View pending gatepasses");
            System.out.println("2. Approve or reject a gatepass");
            System.out.println("3. Logout");
            System.out.print("Choose an option: ");

            switch (scanner.nextLine())
            {
                case "1":
                    showPendingGatePasses();
                    break;
                case "2":
                    decideGatePass(warden);
                    break;
                case "3":
                    loggedIn = false;
                    break;
                default:
                    System.out.println("Please enter 1, 2, or 3.");
            }
        }
    }

    private static void showPendingGatePasses()
    {
        boolean found = false;

        for (GatePass gatePass : gatePasses)
        {
            if (gatePass.getStatus().equals("PENDING"))
            {
                System.out.println(gatePass);
                found = true;
            }
        }

        if (!found)
        {
            System.out.println("There are no pending gatepasses.");
        }
    }

    private static void decideGatePass(Warden warden)
    {
        System.out.print("Enter gatepass ID: ");
        GatePass gatePass = findGatePass(scanner.nextLine());

        if (gatePass == null || !gatePass.getStatus().equals("PENDING"))
        {
            System.out.println("Pending gatepass not found.");
            return;
        }

        System.out.print("Enter A to approve or R to reject: ");
        String decision = scanner.nextLine().trim().toUpperCase();

        if (decision.equals("A"))
        {
            gatePass.approve(warden);
            System.out.println("Gatepass approved.");
        }
        else if (decision.equals("R"))
        {
            gatePass.reject(warden);
            System.out.println("Gatepass rejected.");
        }
        else
        {
            System.out.println("No decision was made.");
        }
    }

    private static Student findStudent(String studentId)
    {
        for (Student student : students)
        {
            if (student.getStudentId().equals(studentId))
            {
                return student;
            }
        }

        return null;
    }

    private static Warden findWarden(String wardenId)
    {
        for (Warden warden : wardens)
        {
            if (warden.getWardenId().equals(wardenId))
            {
                return warden;
            }
        }

        return null;
    }

    private static GatePass findGatePass(String gatePassId)
    {
        for (GatePass gatePass : gatePasses)
        {
            if (gatePass.getId().equalsIgnoreCase(gatePassId))
            {
                return gatePass;
            }
        }

        return null;
    }

}
