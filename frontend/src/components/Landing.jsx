import React, { useState } from 'react';
import { Check, Zap, Globe, Download, FileText, Sparkles, ArrowRight, Star } from 'lucide-react';

export default function ScrappyLandingPage() {
  const [isMonthly, setIsMonthly] = useState(true);
  const [hoveredPlan, setHoveredPlan] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-32 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-8">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Scrappy
            </span>
          </div>
          <div className="hidden md:flex space-x-8">
            <a href="#features" className="hover:text-purple-400 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-purple-400 transition-colors">Pricing</a>
            <a href="#docs" className="hover:text-purple-400 transition-colors">Docs</a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm">Powered by Essential Web Scraper API</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
            Extract Web Content
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
              Like Magic
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform any webpage into clean JSON data or beautiful PDFs with our lightning-fast scraping tool. 
            Single URLs or batch processing up to 20 at once.
          </p>

          {/* Demo Section */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 mb-12 max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Get JSON</span>
              </button>
              <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl font-semibold transition-all border border-white/20 flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Get PDF</span>
              </button>
            </div>
            <div className="text-sm text-slate-400">
              Backend running on <code className="bg-slate-800 px-2 py-1 rounded text-purple-400">localhost:4001</code>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href='/scrape'>
            <button
            
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg">
              <span>Start Scraping Free</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            </a>
            <button className="border-2 border-purple-500 hover:bg-purple-500/10 px-8 py-4 rounded-xl text-lg font-semibold transition-all">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Why Choose Scrappy?</h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Built for developers who need reliable, fast, and scalable web scraping solutions
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              icon: <Zap className="w-8 h-8" />,
              title: "Lightning Fast",
              description: "Process single URLs instantly or batch up to 20 URLs simultaneously with our optimized scraping engine."
            },
            {
              icon: <FileText className="w-8 h-8" />,
              title: "Clean Output",
              description: "Get structured JSON data or perfectly formatted PDFs. No messy HTML or broken formatting."
            },
            {
              icon: <Globe className="w-8 h-8" />,
              title: "Universal Compatibility",
              description: "Works with any website. Our advanced parsing handles dynamic content, SPAs, and complex layouts."
            }
          ].map((feature, index) => (
            <div key={index} className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all group hover:scale-105">
              <div className="text-purple-400 mb-4 group-hover:text-purple-300 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-slate-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Choose Your Plan</h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Start free, scale as you grow. No hidden fees, cancel anytime.
          </p>
          
          {/* Toggle */}
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20">
            <button 
              onClick={() => setIsMonthly(true)}
              className={`px-6 py-2 rounded-full transition-all ${isMonthly ? 'bg-purple-500 text-white' : 'text-slate-300'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setIsMonthly(false)}
              className={`px-6 py-2 rounded-full transition-all relative ${!isMonthly ? 'bg-purple-500 text-white' : 'text-slate-300'}`}
            >
              Yearly
              <span className="absolute -top-2 -right-1 bg-green-500 text-xs px-1 rounded text-white">20% off</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div 
            className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all relative group"
            onMouseEnter={() => setHoveredPlan('free')}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="text-4xl font-black mb-2">$0</div>
              <p className="text-slate-400">Perfect for testing and small projects</p>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "100 requests per month",
                "Single URL processing",
                "JSON & PDF export",
                "Basic support",
                "No credit card required"
              ].map((feature, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm py-3 rounded-xl font-semibold transition-all border border-white/20 group-hover:scale-105">
              Get Started Free
            </button>
          </div>

          {/* Premium Plan */}
          <div 
            className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/30 relative group scale-105 shadow-2xl"
            onMouseEnter={() => setHoveredPlan('premium')}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-4 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
              <Star className="w-4 h-4" />
              <span>MOST POPULAR</span>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <div className="text-4xl font-black mb-2">
                ${isMonthly ? '29' : '24'}
                <span className="text-lg text-slate-400">/{isMonthly ? 'month' : 'month'}</span>
              </div>
              <p className="text-slate-300">For serious scraping needs</p>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "Unlimited requests",
                "Batch processing (up to 20 URLs)",
                "Priority processing",
                "Advanced parsing options",
                "Premium support",
                "API access",
                "Custom integrations"
              ].map((feature, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 py-3 rounded-xl font-semibold transition-all transform group-hover:scale-105 shadow-lg">
              Start Premium Trial
            </button>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-slate-400">
            Need enterprise solutions? <a href="#contact" className="text-purple-400 hover:text-purple-300 underline">Contact our sales team</a>
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-lg rounded-3xl p-12 border border-purple-500/30 max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Start Scraping?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who trust Scrappy for their web scraping needs. 
            Start with our free plan and upgrade when you're ready.
          </p>
          <button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-10 py-4 rounded-xl text-xl font-semibold transition-all transform hover:scale-105 shadow-lg">
            Start Scraping Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">Scrappy</span>
          </div>
          <div className="flex space-x-8 text-slate-400">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms</a>
            <a href="#support" className="hover:text-white transition-colors">Support</a>
            <a href="#api" className="hover:text-white transition-colors">API Docs</a>
          </div>
        </div>
        <div className="text-center mt-8 text-slate-400">
          <p>&copy; 2025 Scrappy. Built with ❤️ for developers.</p>
        </div>
      </footer>
    </div>
  );
}