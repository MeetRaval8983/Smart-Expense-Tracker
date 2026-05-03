# Smart Expense Tracker

A comprehensive expense tracking application with Firebase integration, built with vanilla JavaScript and modern web technologies.

## 🚀 Features

- **User Authentication** - Secure Firebase Auth integration
- **Transaction Management** - Add, edit, and categorize expenses
- **Budget Tracking** - Set and monitor budget limits
- **Account Management** - Multiple account support with bank details
- **Analytics Dashboard** - Visual spending insights and trends
- **Real-time Sync** - Firebase Firestore for live data updates
- **Responsive Design** - Works seamlessly on desktop and mobile

## 🔧 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Build Tool**: Vite
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **Charts**: Chart.js
- **Icons**: Unicode Emojis

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smart-expense-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Firebase configuration
```

4. Start development server:
```bash
npm run dev
```

## 🚀 Deployment

### Firebase Hosting (Recommended)

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase Hosting:
```bash
firebase init hosting
```

4. Deploy to production:
```bash
npm run deploy
```

### Environment Variables

The application uses environment variables for Firebase configuration:

- **Development**: `.env` file
- **Production**: Set in Firebase Hosting console or hosting platform

## 🔐 Security

- Firebase Security Rules for data protection
- Environment variables for sensitive configuration
- Input validation and sanitization
- User-specific data isolation

## 📁 Project Structure

```
smart-expense-tracker/
├── index.html          # Main application file
├── app.js              # Application logic
├── style.css           # Styles and themes
├── firebase-config.js  # Firebase configuration
├── firestore.rules     # Firebase security rules
├── firebase.json       # Firebase hosting configuration
├── vite.config.js      # Vite build configuration
├── package.json        # Dependencies and scripts
├── .env                # Environment variables (local)
├── .env.example        # Environment variables template
└── .gitignore          # Git ignore rules
```

## 🎯 Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to Firebase Hosting
- `npm run serve` - Serve production build locally

## 📊 Firebase Collections

- `users/{userId}/transactions` - User transactions
- `users/{userId}/accounts` - User accounts
- `users/{userId}/budgets` - Budget limits
- `users/{userId}` - User profile data

## 🌟 Features in Detail

### Transaction Management
- Add income and expense transactions
- Categorize spending (Food, Study, Hostel, Travel, Shopping, Other)
- Track transaction dates and notes
- Real-time balance updates

### Budget Tracking
- Set monthly budget limits per category
- Visual progress indicators
- Alerts when approaching limits
- Spending analytics and insights

### Account Management
- Multiple account support (Savings, Current, Wallet)
- Bank name and account number tracking
- Opening balance management
- Account deletion with transaction preservation

### Analytics Dashboard
- Average daily spending calculations
- Savings rate tracking
- Monthly spending trends
- Category-wise spending heatmaps
- 12-month expense trends

## 🔧 Customization

### Adding New Categories
1. Update category options in transaction forms
2. Modify Firestore security rules
3. Update analytics calculations

### Theme Customization
- Modify CSS variables in `style.css`
- Adjust color schemes and gradients
- Update component styling

## 📱 Mobile Responsiveness

- Touch-friendly interface
- Responsive grid layouts
- Optimized modal dialogs
- Mobile-specific navigation

## 🚨 Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Check environment variables
   - Verify Firebase project configuration
   - Ensure Firebase rules are deployed

2. **Build Errors**
   - Clear node_modules and reinstall
   - Check Vite configuration
   - Verify all dependencies are installed

3. **Deployment Issues**
   - Check Firebase CLI authentication
   - Verify firebase.json configuration
   - Ensure build output is in `dist/` folder

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review Firebase documentation

---

**Built with ❤️ using modern web technologies**
