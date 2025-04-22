import React, { useState } from 'react';

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const Notification = ({ date, title, message, isRead }: { date: string; title: string; message: string; isRead: boolean }) => (
  <div className="mt-6">
    <p className="text-sm text-gray-500">{date}</p>
    <div className={`mt-2 p-4 rounded-lg ${isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-900'}`}>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2">{message}</p>
    </div>
  </div>
);

export default function NotificationList() {
  const [searchTerm, setSearchTerm] = useState('');

  const notifications = [
    { date: '14 Jan, 2021', title: 'Online certificate has been released', message: 'Thank you for working on the problem to the end, hopefully it\'s useful', isRead: false },
    { date: '02 Jan, 2021', title: 'Online certificate has been released', message: 'Thank you for working on the problem to the end, hopefully it\'s useful', isRead: true },
    { date: '02 Jan, 2021', title: 'Remember the courses', message: 'We remind you to complete the tasks that have not been done, the spirit of good luck', isRead: true },
  ];

  const filteredNotifications = notifications.filter(notification => 
    notification.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    notification.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex items-center border border-gray-300 rounded-lg px-4 py-2">
        <input 
          type="text" 
          placeholder="Search" 
          className="flex-1 outline-none" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <button className="ml-2 text-gray-500">
          <SearchIcon />
        </button>
      </div>
      {filteredNotifications.map((notification, index) => (
        <Notification key={index} date={notification.date} title={notification.title} message={notification.message} isRead={notification.isRead} />
      ))}
    </div>
  );
}


