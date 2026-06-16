import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import { Button, Modal, Form, Container } from "react-bootstrap";
// import loading from "../../assets/loader.gif";
import "./home.css";
import { addTransaction, getTransactions } from "../../utils/ApiRequest";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Spinner from "../../components/Spinner";
import TableData from "./TableData";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import BarChartIcon from "@mui/icons-material/BarChart";
import Analytics from "./Analytics";

const TOAST_OPTIONS = {
  position: "bottom-right",
  autoClose: 2000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: false,
  draggable: true,
  progress: undefined,
  theme: "dark",
};

const Home = () => {
  const navigate = useNavigate();
  const [cUser, setcUser] = useState();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [frequency, setFrequency] = useState("7");
  const [type, setType] = useState("all");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [view, setView] = useState("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  const handleStartChange = (date) => {
    setStartDate(date);
  };

  const handleEndChange = (date) => {
    setEndDate(date);
  };

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  useEffect(() => {
    const avatarFunc = async () => {
      if (localStorage.getItem("user")) {
        const user = JSON.parse(localStorage.getItem("user"));
        console.log(user);

        if (user.isAvatarImageSet === false || user.avatarImage === "") {
          navigate("/setAvatar");
        }
        setcUser(user);
        setRefresh(true);
      } else {
        navigate("/login");
      }
    };

    avatarFunc();
  }, [navigate]);

  const [values, setValues] = useState({
    title: "",
    amount: "",
    description: "",
    category: "",
    date: "",
    transactionType: "",
  });

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleChangeFrequency = (e) => {
    setFrequency(e.target.value);
  };

  const handleSetType = (e) => {
    setType(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { title, amount, description, category, date, transactionType } =
      values;

    if (
      !title ||
      !amount ||
      !description ||
      !category ||
      !date ||
      !transactionType
    ) {
      toast.error("Please enter all the fields", TOAST_OPTIONS);
      return;
    }

    try {
      setLoading(true);

      const { data } = await axios.post(addTransaction, {
        title: title,
        amount: amount,
        description: description,
        category: category,
        date: date,
        transactionType: transactionType,
        userId: cUser._id,
      });

      if (data.success === true) {
        toast.success(data.message, TOAST_OPTIONS);
        setValues({
          title: "",
          amount: "",
          description: "",
          category: "",
          date: "",
          transactionType: "",
        });
        handleClose();
        setRefresh(!refresh);
      } else {
        toast.error(data.message, TOAST_OPTIONS);
      }
    } catch (err) {
      toast.error(
        "Unable to add transaction. Please try again.",
        TOAST_OPTIONS,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setType("all");
    setStartDate(null);
    setEndDate(null);
    setFrequency("7");
    setSearchTerm("");
    setSortBy("newest");
  };

  useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!cUser?._id) {
        return;
      }

      try {
        setLoading(true);
        const { data } = await axios.post(getTransactions, {
          userId: cUser._id,
          frequency: frequency,
          startDate: startDate,
          endDate: endDate,
          type: type,
        });

        setTransactions(data.transactions);

        setLoading(false);
      } catch (err) {
        toast.error("Unable to load transactions.", TOAST_OPTIONS);
        setLoading(false);
      }
    };

    fetchAllTransactions();
  }, [refresh, frequency, endDate, type, startDate, cUser]);

  const handleTableClick = (e) => {
    setView("table");
  };

  const handleChartClick = (e) => {
    setView("chart");
  };

  const filteredTransactions = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const searched = transactions.filter((item) => {
      if (!keyword) {
        return true;
      }

      const searchableText =
        `${item.title} ${item.category} ${item.description}`.toLowerCase();
      return searchableText.includes(keyword);
    });

    const sorted = [...searched].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.date) - new Date(b.date);
      }

      if (sortBy === "amount-high") {
        return Number(b.amount) - Number(a.amount);
      }

      if (sortBy === "amount-low") {
        return Number(a.amount) - Number(b.amount);
      }

      return new Date(b.date) - new Date(a.date);
    });

    return sorted;
  }, [transactions, searchTerm, sortBy]);

  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter((item) => item.transactionType === "credit")
      .reduce((total, item) => total + Number(item.amount), 0);

    const expense = filteredTransactions
      .filter((item) => item.transactionType === "expense")
      .reduce((total, item) => total + Number(item.amount), 0);

    return {
      total: income + expense,
      income,
      expense,
      net: income - expense,
    };
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.info("No records available for export.", TOAST_OPTIONS);
      return;
    }

    const header = "Date,Title,Amount,Type,Category,Description";
    const rows = filteredTransactions.map((item) => {
      const row = [
        new Date(item.date).toISOString().split("T")[0],
        item.title,
        item.amount,
        item.transactionType,
        item.category,
        (item.description || "").replaceAll(",", " "),
      ];
      return row.join(",");
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header />

      {loading ? (
        <>
          <Spinner />
        </>
      ) : (
        <>
          <Container
            style={{ position: "relative", zIndex: "2 !important" }}
            className="mt-3 homeContainer"
          >
            <div className="summaryGrid">
              <div className="summaryCard">
                <p>Total</p>
                <h4>{formatCurrency(summary.total)}</h4>
              </div>
              <div className="summaryCard">
                <p>Income</p>
                <h4 className="incomeText">{formatCurrency(summary.income)}</h4>
              </div>
              <div className="summaryCard">
                <p>Expense</p>
                <h4 className="expenseText">
                  {formatCurrency(summary.expense)}
                </h4>
              </div>
              <div className="summaryCard">
                <p>Net Balance</p>
                <h4 className={summary.net >= 0 ? "incomeText" : "expenseText"}>
                  {formatCurrency(summary.net)}
                </h4>
              </div>
            </div>

            <div className="filterRow">
              <div className="text-white">
                <Form.Group className="mb-3" controlId="formSelectFrequency">
                  <Form.Label>Select Frequency</Form.Label>
                  <Form.Select
                    name="frequency"
                    value={frequency}
                    onChange={handleChangeFrequency}
                  >
                    <option value="7">Last Week</option>
                    <option value="30">Last Month</option>
                    <option value="365">Last Year</option>
                    <option value="custom">Custom</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="text-white type">
                <Form.Group className="mb-3" controlId="formSelectFrequency">
                  <Form.Label>Type</Form.Label>
                  <Form.Select
                    name="type"
                    value={type}
                    onChange={handleSetType}
                  >
                    <option value="all">All</option>
                    <option value="expense">Expense</option>
                    <option value="credit">Earned</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="text-white searchBox">
                <Form.Group className="mb-3" controlId="formSearchTxn">
                  <Form.Label>Search</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Title, category, description"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </Form.Group>
              </div>

              <div className="text-white type">
                <Form.Group className="mb-3" controlId="formSortBy">
                  <Form.Label>Sort</Form.Label>
                  <Form.Select value={sortBy} onChange={handleSortChange}>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="amount-high">Amount: High to Low</option>
                    <option value="amount-low">Amount: Low to High</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="text-white iconBtnBox">
                <FormatListBulletedIcon
                  sx={{ cursor: "pointer" }}
                  onClick={handleTableClick}
                  className={`${
                    view === "table" ? "iconActive" : "iconDeactive"
                  }`}
                />
                <BarChartIcon
                  sx={{ cursor: "pointer" }}
                  onClick={handleChartClick}
                  className={`${
                    view === "chart" ? "iconActive" : "iconDeactive"
                  }`}
                />
              </div>

              <div>
                <Button onClick={handleShow} className="addNew">
                  Add New
                </Button>
                <Button onClick={handleShow} className="mobileBtn">
                  +
                </Button>
                <Modal show={show} onHide={handleClose} centered>
                  <Modal.Header closeButton>
                    <Modal.Title>Add Transaction Details</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <Form>
                      <Form.Group className="mb-3" controlId="formName">
                        <Form.Label>Title</Form.Label>
                        <Form.Control
                          name="title"
                          type="text"
                          placeholder="Enter Transaction Name"
                          value={values.name}
                          onChange={handleChange}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="formAmount">
                        <Form.Label>Amount</Form.Label>
                        <Form.Control
                          name="amount"
                          type="number"
                          placeholder="Enter your Amount"
                          value={values.amount}
                          onChange={handleChange}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="formSelect">
                        <Form.Label>Category</Form.Label>
                        <Form.Select
                          name="category"
                          value={values.category}
                          onChange={handleChange}
                        >
                          <option value="">Choose...</option>
                          <option value="Groceries">Groceries</option>
                          <option value="Rent">Rent</option>
                          <option value="Salary">Salary</option>
                          <option value="Tip">Tip</option>
                          <option value="Food">Food</option>
                          <option value="Medical">Medical</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Transportation">Transportation</option>
                          <option value="Other">Other</option>
                        </Form.Select>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="formDescription">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          type="text"
                          name="description"
                          placeholder="Enter Description"
                          value={values.description}
                          onChange={handleChange}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="formSelect1">
                        <Form.Label>Transaction Type</Form.Label>
                        <Form.Select
                          name="transactionType"
                          value={values.transactionType}
                          onChange={handleChange}
                        >
                          <option value="">Choose...</option>
                          <option value="credit">Credit</option>
                          <option value="expense">Expense</option>
                        </Form.Select>
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="formDate">
                        <Form.Label>Date</Form.Label>
                        <Form.Control
                          type="date"
                          name="date"
                          value={values.date}
                          onChange={handleChange}
                        />
                      </Form.Group>

                      {/* Add more form inputs as needed */}
                    </Form>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                      Close
                    </Button>
                    <Button variant="primary" onClick={handleSubmit}>
                      Submit
                    </Button>
                  </Modal.Footer>
                </Modal>
              </div>
            </div>
            <br style={{ color: "white" }}></br>

            {frequency === "custom" ? (
              <>
                <div className="date">
                  <div className="form-group">
                    <label htmlFor="startDate" className="text-white">
                      Start Date:
                    </label>
                    <div>
                      <DatePicker
                        selected={startDate}
                        onChange={handleStartChange}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="endDate" className="text-white">
                      End Date:
                    </label>
                    <div>
                      <DatePicker
                        selected={endDate}
                        onChange={handleEndChange}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <></>
            )}

            <div className="containerBtn">
              <Button variant="primary" onClick={handleReset}>
                Reset Filter
              </Button>
              <Button
                variant="outline-light"
                className="ms-2"
                onClick={handleExportCSV}
              >
                Export CSV
              </Button>
            </div>

            {filteredTransactions.length === 0 && !loading ? (
              <div className="emptyState">
                No transactions found for selected filters.
              </div>
            ) : null}

            {view === "table" ? (
              <>
                <TableData
                  data={filteredTransactions}
                  user={cUser}
                  onDataChanged={() => setRefresh(!refresh)}
                />
              </>
            ) : (
              <>
                <Analytics transactions={filteredTransactions} user={cUser} />
              </>
            )}
            <ToastContainer />
          </Container>
        </>
      )}
    </>
  );
};

export default Home;