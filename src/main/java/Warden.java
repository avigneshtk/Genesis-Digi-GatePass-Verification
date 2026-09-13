public class Warden
{
    private final String wardenId;
    private final String name;
    private final String hostelName;
    private final String password;

    public Warden(String wardenId, String name, String hostelName, String password)
    {
        this.wardenId = wardenId;
        this.name = name;
        this.hostelName = hostelName;
        this.password = password;
    }

    public String getWardenId()
    {
        return wardenId;
    }

    public String getName()
    {
        return name;
    }

    public String getHostelName()
    {
        return hostelName;
    }

    public boolean checkPassword(String enteredPassword)
    {
        return password.equals(enteredPassword);
    }
}
