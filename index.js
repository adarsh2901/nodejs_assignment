const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
  });

// Define the Employee schema
const employeeSchema = new mongoose.Schema({
  fullName: String,
  jobTitle: String,
  contacts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
    },
  ],
});

// Define the Contact schema
const contactSchema = new mongoose.Schema({
  type: String,
  name: String,
  phone: String,
  relationship: String,
  email: String,
  address: String,
  city: String,
  state: String,
});

// Create the Employee model
const Employee = mongoose.model("Employee", employeeSchema);

// Create the Contact model
const Contact = mongoose.model("Contact", contactSchema);

// Create the Express app
const app = express();
app.use(express.json());

// Create Employee with multiple contact details
app.post("/employees", async (req, res) => {
  try {
    // Extract employee and contact details from request body
    const {
      fullName,
      jobTitle,
      phoneNumber,
      email,
      address,
      city,
      state,
      emergencyContact1,
      emergencyContact1Phone,
      emergencyContact1Relationship,
      emergencyContact2,
      emergencyContact2Phone,
      emergencyContact2Relationship,
    } = req.body;

    // Create a new Employee instance with basic details
    const employee = new Employee({
      fullName,
      jobTitle,
      contacts: [],
    });

    // Create primary emergency contact instance
    const primaryEmergencyContact = new Contact({
      type: "Primary",
      name: emergencyContact1,
      phone: emergencyContact1Phone,
      relationship: emergencyContact1Relationship,
    });

    // Create secondary emergency contact instance
    const secondaryEmergencyContact = new Contact({
      type: "Secondary",
      name: emergencyContact2,
      phone: emergencyContact2Phone,
      relationship: emergencyContact2Relationship,
    });

    // Save emergency contacts to the database
    await primaryEmergencyContact.save();
    await secondaryEmergencyContact.save();

    // Add emergency contacts to the employee's contact list
    employee.contacts.push(primaryEmergencyContact, secondaryEmergencyContact);

    // Create additional contact instance
    const additionalContact = new Contact({
      type: "Additional",
      phone: phoneNumber,
      email,
      address,
      city,
      state,
    });

    // Save additional contact to the database
    await additionalContact.save();
    employee.contacts.push(additionalContact);

    // Save the employee to the database
    await employee.save();

    res.status(201).json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Employee
app.put("/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, jobTitle, contacts } = req.body;

    // Find the employee by ID and populate the contacts
    const employee = await Employee.findById(id).populate("contacts");

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Update the employee's fullName and jobTitle with new values if provided
    employee.fullName = fullName || employee.fullName;
    employee.jobTitle = jobTitle || employee.jobTitle;

    if (contacts) {
      contacts.forEach((contact) => {
        // Find the corresponding contact in the employee's contact list
        const existingContact = employee.contacts.find(
          (c) => c._id.toString() === contact._id
        );

        if (existingContact) {
          // Update the contact's fields with new values if provided
          existingContact.name = contact.name || existingContact.name;
          existingContact.phone = contact.phone || existingContact.phone;
          existingContact.relationship =
            contact.relationship || existingContact.relationship;
          existingContact.email = contact.email || existingContact.email;
          existingContact.address = contact.address || existingContact.address;
          existingContact.city = contact.city || existingContact.city;
          existingContact.state = contact.state || existingContact.state;
        }
      });
    }

    // Save the updated employee to the database
    await employee.save();

    res.status(200).json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete Employee
app.delete("/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the employee by ID and delete it
    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Delete associated contacts
    await Contact.deleteMany({ _id: { $in: employee.contacts } });

    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Employee
app.get("/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the employee by ID and populate the contacts
    const employee = await Employee.findById(id).populate("contacts");

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.status(200).json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List Employees with pagination
app.get("/employees", async (req, res) => {
  try {
    // Extract page and limit parameters from the request query, defaulting to page 1 and limit of 10 employees per page
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate the number of documents to skip based on the page and limit
    const skip = (page - 1) * limit;

    // Get the total count of employees in the database
    const totalEmployees = await Employee.countDocuments();

    // Retrieve employees with pagination and populate the contacts
    const employees = await Employee.find()
      .skip(skip)
      .limit(limit)
      .populate("contacts");

    // Calculate the total number of pages based on the total count and limit
    const totalPages = Math.ceil(totalEmployees / limit);

    // Send the employees, total pages, and current page as a JSON response with a status code of 200 (OK)
    res.status(200).json({
      totalPages,
      currentPage: page,
      employees,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
