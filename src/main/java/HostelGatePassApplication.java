import javafx.application.Application;
import javafx.beans.property.SimpleStringProperty;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonType;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

public class HostelGatePassApplication extends Application
{
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");

    private final ObservableList<GatePass> gatePasses = FXCollections.observableArrayList();
    private final Database database = new Database();
    private Stage stage;
    private Student currentStudent;
    private Warden currentWarden;

    @Override
    public void start(Stage primaryStage)
    {
        stage = primaryStage;
        stage.setTitle("Hostel Gatepass Verification System");

        try
        {
            database.initialize();
            gatePasses.setAll(database.loadGatePasses());
            showLoginScreen();
            stage.show();
        }
        catch (IllegalStateException exception)
        {
            showError("Database error", "The application could not open its SQLite database.");
        }
    }

    private void showLoginScreen()
    {
        Label title = new Label("Hostel Gatepass");
        title.getStyleClass().add("app-title");
        Label subtitle = new Label("Sign in to manage gatepass requests");
        subtitle.getStyleClass().add("subtitle");

        ComboBox<String> roleBox = new ComboBox<>();
        roleBox.getItems().addAll("Student", "Warden");
        roleBox.setPromptText("Select your role");
        roleBox.setMaxWidth(Double.MAX_VALUE);
        TextField idField = new TextField();
        idField.setPromptText("User ID");
        PasswordField passwordField = new PasswordField();
        passwordField.setPromptText("Password");
        Button loginButton = new Button("Sign in");
        loginButton.setMaxWidth(Double.MAX_VALUE);
        loginButton.getStyleClass().add("primary-button");
        loginButton.setOnAction(event -> login(roleBox.getValue(), idField.getText(), passwordField.getText()));

        VBox card = new VBox(14, title, subtitle, new Label("Role"), roleBox, new Label("User ID"), idField,
                new Label("Password"), passwordField, loginButton,
                new Label("Student: STU001 / student123\nWarden: WARDEN01 / warden123"));
        card.getStyleClass().add("login-card");
        card.setMaxWidth(390);

        VBox root = new VBox(card);
        root.setAlignment(Pos.CENTER);
        root.getStyleClass().add("login-page");
        stage.setScene(createScene(root, 640, 580));
    }

    private void login(String role, String id, String password)
    {
        if ("Student".equals(role))
        {
            currentStudent = database.authenticateStudent(id, password);

            if (currentStudent != null)
            {
                showStudentDashboard();
                return;
            }
        }

        if ("Warden".equals(role))
        {
            currentWarden = database.authenticateWarden(id, password);

            if (currentWarden != null)
            {
                showWardenDashboard();
                return;
            }
        }

        showError("Login failed", "Check your selected role, user ID, and password.");
    }

    private void showStudentDashboard()
    {
        Label title = new Label("Student Dashboard");
        title.getStyleClass().add("screen-title");
        Label greeting = new Label("Welcome, " + currentStudent.getName() + "  •  Room " + currentStudent.getRoomNumber());
        greeting.getStyleClass().add("subtitle");

        TextField destinationField = new TextField();
        destinationField.setPromptText("Example: Chennai");
        TextArea reasonField = new TextArea();
        reasonField.setPromptText("Why are you leaving the hostel?");
        reasonField.setPrefRowCount(3);
        LocalDateTime leaveDefault = LocalDateTime.now().plusHours(6);
        LocalDateTime returnDefault = leaveDefault.plusDays(2);
        TextField leaveField = new TextField(leaveDefault.format(DATE_FORMAT));
        TextField returnField = new TextField(returnDefault.format(DATE_FORMAT));
        Label timeHelp = new Label("Defaults: leave in 6 hours; return 2 days after leaving.");
        timeHelp.getStyleClass().add("hint");

        GridPane form = new GridPane();
        form.setHgap(12);
        form.setVgap(10);
        form.add(new Label("Destination"), 0, 0);
        form.add(destinationField, 1, 0);
        form.add(new Label("Reason"), 0, 1);
        form.add(reasonField, 1, 1);
        form.add(new Label("Leave time"), 0, 2);
        form.add(leaveField, 1, 2);
        form.add(new Label("Expected return"), 0, 3);
        form.add(returnField, 1, 3);
        form.add(timeHelp, 1, 4);
        GridPane.setHgrow(destinationField, Priority.ALWAYS);
        GridPane.setHgrow(reasonField, Priority.ALWAYS);
        GridPane.setHgrow(leaveField, Priority.ALWAYS);
        GridPane.setHgrow(returnField, Priority.ALWAYS);

        Button submitButton = new Button("Submit gatepass request");
        submitButton.getStyleClass().add("primary-button");
        submitButton.setOnAction(event ->
        {
            if (destinationField.getText().isBlank() || reasonField.getText().isBlank()
                    || leaveField.getText().isBlank() || returnField.getText().isBlank())
            {
                showError("Missing details", "Complete every gatepass field before submitting.");
                return;
            }

            GatePass gatePass = new GatePass(currentStudent, destinationField.getText().trim(), reasonField.getText().trim(),
                    leaveField.getText().trim(), returnField.getText().trim());
            database.saveGatePass(gatePass);
            gatePasses.setAll(database.loadGatePasses());
            destinationField.clear();
            reasonField.clear();
            leaveField.setText(LocalDateTime.now().plusHours(6).format(DATE_FORMAT));
            returnField.setText(LocalDateTime.now().plusHours(6).plusDays(2).format(DATE_FORMAT));
            showInformation("Request submitted", "Your gatepass has been sent to the warden for approval.");
        });

        TableView<GatePass> table = createGatePassTable(false);
        table.setItems(gatePasses.filtered(pass -> pass.getStudent().getStudentId().equals(currentStudent.getStudentId())));
        VBox content = new VBox(18, title, greeting, section("New gatepass request", form, submitButton),
                section("My requests", table));
        showDashboard(content, "Student");
    }

    private void showWardenDashboard()
    {
        Label title = new Label("Warden Dashboard");
        title.getStyleClass().add("screen-title");
        Label greeting = new Label("Welcome, " + currentWarden.getName() + "  •  " + currentWarden.getHostelName());
        greeting.getStyleClass().add("subtitle");
        TableView<GatePass> table = createGatePassTable(true);
        table.setItems(gatePasses);

        Button approveButton = new Button("Approve selected");
        approveButton.getStyleClass().add("primary-button");
        approveButton.setOnAction(event -> decideSelected(table, true));
        Button rejectButton = new Button("Reject selected");
        rejectButton.getStyleClass().add("danger-button");
        rejectButton.setOnAction(event -> decideSelected(table, false));
        HBox actions = new HBox(10, approveButton, rejectButton);

        VBox content = new VBox(18, title, greeting, section("Gatepass requests", table, actions));
        showDashboard(content, "Warden");
    }

    private void decideSelected(TableView<GatePass> table, boolean approve)
    {
        GatePass selectedPass = table.getSelectionModel().getSelectedItem();

        if (selectedPass == null)
        {
            showError("No gatepass selected", "Select a request from the table first.");
            return;
        }

        if (!selectedPass.getStatus().equals("PENDING") && !confirmDecisionChange(selectedPass, approve))
        {
            return;
        }

        if (approve)
        {
            selectedPass.approve(currentWarden);
        }
        else
        {
            selectedPass.reject(currentWarden);
        }

        database.updateDecision(selectedPass);
        table.refresh();
    }

    private boolean confirmDecisionChange(GatePass gatePass, boolean approve)
    {
        String newStatus;

        if (approve)
        {
            newStatus = "APPROVED";
        }
        else
        {
            newStatus = "REJECTED";
        }

        Alert confirmation = new Alert(Alert.AlertType.CONFIRMATION);
        confirmation.setTitle("Change gatepass decision?");
        confirmation.setHeaderText("This gatepass is currently " + gatePass.getStatus() + ".");
        confirmation.setContentText("Do you want to change it to " + newStatus + "?");
        Optional<ButtonType> selectedButton = confirmation.showAndWait();

        return selectedButton.isPresent() && selectedButton.get() == ButtonType.OK;
    }

    private TableView<GatePass> createGatePassTable(boolean includeStudent)
    {
        TableView<GatePass> table = new TableView<>();
        table.setPlaceholder(new Label("No gatepass requests yet."));
        table.getColumns().add(column("ID", GatePass::getId, 80));

        if (includeStudent)
        {
            table.getColumns().add(column("Student", pass -> pass.getStudent().getName(), 150));
        }

        table.getColumns().add(column("Destination", GatePass::getDestination, 130));
        table.getColumns().add(column("Leave time", GatePass::getOutDateTime, 160));
        table.getColumns().add(column("Expected return", GatePass::getReturnDateTime, 160));
        table.getColumns().add(column("Status", GatePass::getStatus, 105));
        table.setPrefHeight(270);
        return table;
    }

    private TableColumn<GatePass, String> column(String heading, java.util.function.Function<GatePass, String> value, double width)
    {
        TableColumn<GatePass, String> column = new TableColumn<>(heading);
        column.setCellValueFactory(data -> new SimpleStringProperty(value.apply(data.getValue())));
        column.setPrefWidth(width);
        return column;
    }

    private VBox section(String heading, javafx.scene.Node... content)
    {
        Label headingLabel = new Label(heading);
        headingLabel.getStyleClass().add("section-title");
        VBox box = new VBox(12);
        box.getChildren().add(headingLabel);
        box.getChildren().addAll(content);
        box.getStyleClass().add("card");
        return box;
    }

    private void showDashboard(VBox content, String role)
    {
        Button logoutButton = new Button("Log out");
        logoutButton.setOnAction(event -> showLoginScreen());
        HBox header = new HBox(new Label("HOSTEL GATEPASS"), new Label(role), logoutButton);
        header.setAlignment(Pos.CENTER_LEFT);
        header.setSpacing(16);
        header.getStyleClass().add("top-bar");
        HBox.setHgrow(header.getChildren().get(1), Priority.ALWAYS);

        BorderPane root = new BorderPane();
        root.setTop(header);
        root.setCenter(content);
        root.getStyleClass().add("dashboard-page");
        BorderPane.setMargin(content, new Insets(28));
        stage.setScene(createScene(root, 1040, 760));
    }

    private Scene createScene(javafx.scene.Parent root, double width, double height)
    {
        Scene scene = new Scene(root, width, height);
        scene.getStylesheets().add(getClass().getResource("/application.css").toExternalForm());
        return scene;
    }

    private void showError(String title, String message)
    {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.showAndWait();
    }

    private void showInformation(String title, String message)
    {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.showAndWait();
    }

    public static void main(String[] args)
    {
        launch(args);
    }
}
