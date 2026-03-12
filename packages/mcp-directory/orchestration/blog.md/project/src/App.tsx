import React from 'react';
import { ArrowRight, CheckCircle2, BarChart2, Zap, Shield, Users } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-white text-2xl font-bold">SaasFlow</div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-white hover:text-indigo-200">Features</a>
              <a href="#pricing" className="text-white hover:text-indigo-200">Pricing</a>
              <a href="#testimonials" className="text-white hover:text-indigo-200">Testimonials</a>
            </div>
            <button className="bg-white text-indigo-600 px-6 py-2 rounded-full font-semibold hover:bg-indigo-50 transition duration-300">
              Get Started
            </button>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-24">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                Streamline Your Business Operations
              </h1>
              <p className="mt-6 text-xl text-indigo-100">
                Powerful automation tools to help you scale your business and increase productivity.
              </p>
              <div className="mt-8 flex space-x-4">
                <button className="bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold hover:bg-indigo-50 transition duration-300 flex items-center">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <button className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-indigo-600 transition duration-300">
                  Watch Demo
                </button>
              </div>
            </div>
            <div className="md:w-1/2 mt-12 md:mt-0">
              <img 
                src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80" 
                alt="Dashboard Preview"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-16">
            Powerful Features for Your Business
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: <BarChart2 className="h-10 w-10 text-indigo-600" />,
                title: "Advanced Analytics",
                description: "Get deep insights into your business performance with real-time analytics."
              },
              {
                icon: <Zap className="h-10 w-10 text-indigo-600" />,
                title: "Automation Tools",
                description: "Automate repetitive tasks and focus on what matters most to your business."
              },
              {
                icon: <Shield className="h-10 w-10 text-indigo-600" />,
                title: "Enterprise Security",
                description: "Bank-grade security to keep your data safe and compliant."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                {feature.icon}
                <h3 className="text-xl font-semibold mt-4 text-gray-800">{feature.title}</h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-16">
            Simple, Transparent Pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "49",
                features: ["5 Team Members", "10GB Storage", "Basic Analytics", "Email Support"]
              },
              {
                name: "Professional",
                price: "99",
                features: ["15 Team Members", "50GB Storage", "Advanced Analytics", "24/7 Support"]
              },
              {
                name: "Enterprise",
                price: "199",
                features: ["Unlimited Team Members", "500GB Storage", "Custom Analytics", "Dedicated Support"]
              }
            ].map((plan, index) => (
              <div key={index} className={`bg-white p-8 rounded-xl shadow-lg ${index === 1 ? 'border-2 border-indigo-600' : ''}`}>
                <h3 className="text-2xl font-bold text-gray-800">{plan.name}</h3>
                <p className="mt-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </p>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center text-gray-600">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className={`mt-8 w-full py-3 px-6 rounded-full font-semibold ${
                  index === 1 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                } transition duration-300`}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-16">
            Trusted by Industry Leaders
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            {[
              {
                quote: "SaasFlow has transformed how we manage our operations. The automation features alone have saved us countless hours.",
                author: "Sarah Johnson",
                role: "CEO at TechCorp",
                image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
              },
              {
                quote: "The analytics capabilities are incredible. We've gained insights that have helped us make better business decisions.",
                author: "Michael Chen",
                role: "CTO at InnovateLabs",
                image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg">
                <p className="text-gray-600 italic">{testimonial.quote}</p>
                <div className="mt-6 flex items-center">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.author}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="ml-4">
                    <p className="font-semibold text-gray-800">{testimonial.author}</p>
                    <p className="text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">SaasFlow</h3>
              <p className="text-gray-400">Empowering businesses with powerful automation tools.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Twitter</a></li>
                <li><a href="#" className="hover:text-white">LinkedIn</a></li>
                <li><a href="#" className="hover:text-white">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>© 2025 SaasFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;