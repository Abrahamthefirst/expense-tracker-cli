const { Command } = require("commander");
const { removeNullKeys } = require("./util");
const prisma = require("./connection");
const fs = require("fs");
const program = new Command();

program
  .name("expense-tracker")
  .description("backend road map expense tracker application")
  .option("-d, --description <desc>", "description of the expense");

async function createUser(name, email) {
  const user = await prisma.user.create({
    data: {
      name,
      email,
    },
  });

  console.log("User created", user);
  return user;
}
program
  .command("create-user")
  .option("-n, --name <name>")
  .option("-e, --email <email>")
  .action(async (options) => {
    console.log(options);
    const { name, email } = options;
    await createUser(name, email);
  });

async function getAllUsers() {
  const users = await prisma.user.findMany();
  console.log(users);
}

async function getUser(email) {
  const user = await prisma.user.findFirst({
    where: { email },
  });
  return user;
}
async function getUserByEmail(email) {
  const user = await prisma.user.findUnique({
    data: { email },
  });
}

async function createExpense(description, amount, userId, categoryId = null) {
  console.log(description, amount, userId, categoryId);
  const expense = await prisma.expense.create({
    data: {
      userId,
      description,
      date: new Date("2026-05-20"),
      amount: parseFloat(amount),
      categoryId: categoryId,
    },
  });
  return expense;
}

program
  .command("create")
  .description("add an expense")
  .option("-a, --amount <amount>", "How much was spent")
  .option("-c, --category <name>", "The category of the expense")
  .option("-u, --user <user>", "The user")
  .option("-h, --description <description>", "description of the expense")
  .action(async (options) => {
    const { description, amount, category, email } = options;

    const user = await getUser(email);
    if (!user) {
      console.log("User not found");
      return;
    }

    const userBudget = await prisma.budget.findFirst({
      where: {
        userId: user.id,
      },
    });

    console.log(userBudget);

    const expense = await createExpense(
      description,
      amount,
      user.id,
      category.id
    );
    console.log("Expense added succesfully (ID: ", expense.id, ")");
    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
      },
    });
    console.log(expenses);
    const totalExpenses = expenses.reduce(
      (acc, expense) => acc + expense.amount,
      0
    );
    console.log(totalExpenses);

    if (totalExpenses > userBudget.amount) {
      console.log("\x1b[31m%s\x1b[0m", "You've exceeded your budget");
    }
  });

async function updateExpense(options) {
  const { id, description, amount, category } = removeNullKeys(options);
  const updateExpense = await prisma.expense.update({
    where: { id: parseInt(id) },
    data: {
      ...(description && { description }),
      ...(amount && { amount: parseFloat(amount) }),
      ...(category && { category }),
    },
  });
  return updateExpense;
}
program
  .command("update")
  .description("update an expense")
  .option("-h, --description <desc>", "description of the expense")
  .option("-a, --amount <num>", "How much was spent")
  .option("-i, --id <num>", "The id of the expense")
  .option("-c, --category <name>", "The category of the expense")
  .action(async (options) => {
    const { description, amount, category, id } = options;
    console.log(options);
    const expense = await updateExpense(options);
    console.log(expense);
  });

program
  .command("delete")
  .description("delete an expense")
  .option("-d, --description <desc>", "description of the expense")
  .option("-a, --amount <num>", "How much was spent")
  .option("-c, --category <name>", "The category of the expense")
  .option("-i, --id <num>", "The id of the expense")
  .action(async (options) => {
    const { id } = options;
    const expense = await prisma.expense.delete({
      where: { id: parseInt(id) },
    });
    console.log("Expense Deleted", expense);
  });

program
  .command("view")
  .description("view all expenses")
  .option("-u, --user <id>")
  .action(async (option) => {
    const expenses = await prisma.expense.findMany({
      where: {
        id: option.id,
      },
    });

    console.log("ID  Date    Description        Amount");

    for (record of expenses) {
      console.log(
        `${record.id}  ${new Date(record.date).toISOString().split("T")[0]}  ${
          record.description
        }  ${record.amount}`
      );
    }
  });

program
  .command("summary")
  .description("summary of expenses")
  .action(async () => {
    console.log("Summary");
    const expenses = await prisma.expense.findMany({});
    const total = expenses.reduce((acc, expense) => acc + expense.amount, 0);
    console.log("Total expenses: $", total);
  });

program
  .command("category")
  .description("create a category")
  .option("-n, --name <name>")
  .action(async (options) => {
    const { name } = options;
    const category = await prisma.category.create({
      data: {
        name,
      },
    });

    console.log("Category Created: ", category);
  });

program
  .command("list-category")
  .description("Expenses Category")
  .requiredOption("-n, --name <name>", "Category name")
  .action(async (options) => {
    const { name } = options;
    const category = await prisma.category.findMany({
      where: { name },
    });
    console.log(category);
  });

program
  .command("budget")
  .description("Create a budget")
  .requiredOption("-n, --name <name>", "Category name")
  .requiredOption("-u, --id <id>", "User")
  .requiredOption("-a, --amount <amount>", "amount")
  .requiredOption("-b, --start <start>", "start")
  .requiredOption("-e, --end <end>", "end")
  .action(async (options) => {
    const { name, id, amount, start, end } = options;
    console.log("This is the user id", id, name, amount, start, end);
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(id),
      },
    });
    console.log(user, user.id);
    const budget = await prisma.budget.create({
      data: {
        userId: user.id,

        amount: parseFloat(amount),
        name,
        startDate: new Date(start),
        endDate: new Date(end),
      },
    });

    console.log(budget);
  });

program
  .command("month-expense")
  .description("Monthly Expense")
  .requiredOption("-m, --month <month>")
  .action(async (options) => {
    const { month } = options;
    let month_figure = month.split("-")[1];
    if (month_figure.startsWith(1)) {
      month_figure += 1;
    } else {
      month_figure = `0${parseInt(month_figure[1]) + 1}`;
    }
    const month_value = `${month.split("-")[0]}-${month_figure}-${
      month.split("-")[2]
    }`;
    console.log(month_value);
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(month),
          lt: new Date(month_value),
        },
      },
    });

    console.log(expenses);
  });

program
  .command("export")
  .description("Export Expense to a csv file")
  .option("-u, --user <id>")
  .action(async (options) => {
    const expenses = await prisma.expense.findMany({
      where: {
        id: options.id,
      },
    });

    const stream = fs.createWriteStream("./expense.csv", { flag: "a+" });
    stream.write(`Id, Date, Description, Amount \n`);
    for (const record of expenses) {
      stream.write(`${record.id}, ${new Date(record.date).toISOString().split("T")[0]}, ${record.description}, ${record.amount} \n`);
    }
  });

program.parse(process.argv);



